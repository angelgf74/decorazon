using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Decorazon.Contratos;
using Decorazon.Contratos.Disenos;
using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Decorazon.Api.Tests;

/// <summary>
/// Los diseños por HTTP contra PostgreSQL: CRUD con ETag, contenido hostil,
/// diseños ajenos y el límite por usuario.
/// </summary>
[Trait("Categoria", "Integracion")]
public class DisenosTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    private const string ContenidoEditado =
        """{"formato":1,"estancia":{"ancho":350,"largo":420},"aberturas":[{"tipo":"puerta"}],"estructura":[],"elementos":[{"id":"cama"}]}""";

    // ------------------------------------------------------------------ CRUD

    [Fact]
    public async Task Crud_ConETag_DeExtremoAExtremo()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);

        // Crear: 201, Location y ETag "1".
        var creado = await cliente.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion("  Mi dormitorio  "));
        Assert.Equal(HttpStatusCode.Created, creado.StatusCode);
        Assert.Equal("\"1\"", creado.Headers.ETag?.Tag);
        Assert.False(creado.Headers.ETag!.IsWeak);
        var diseno = (await creado.Content.ReadFromJsonAsync<RespuestaDeDiseno>())!;
        Assert.Equal($"/disenos/{diseno.Id}", creado.Headers.Location?.OriginalString);
        Assert.Equal("Mi dormitorio", diseno.Nombre);
        Assert.Equal("dormitorio", diseno.TipoEstancia);
        Assert.Equal(1, diseno.Version);

        // Leer: mismo contenido (como JSON, no como texto: jsonb lo reformatea) y ETag "1".
        var leido = await cliente.GetAsync($"/disenos/{diseno.Id}");
        Assert.Equal(HttpStatusCode.OK, leido.StatusCode);
        Assert.Equal("\"1\"", leido.Headers.ETag?.Tag);
        var cuerpo = (await leido.Content.ReadFromJsonAsync<RespuestaDeDiseno>())!;
        Assert.True(MismoJson(DisenosDePrueba.ContenidoMinimo, cuerpo.Contenido.GetRawText()));

        // Listar: aparece, sin contenido.
        var lista = (await cliente.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!;
        var resumen = Assert.Single(lista);
        Assert.Equal(diseno.Id, resumen.Id);
        Assert.Equal(1, resumen.Version);

        // Actualizar con If-Match "1": 200 y ETag "2".
        var actualizado = await PutAsync(cliente, diseno.Id, DisenosDePrueba.Peticion("Dormitorio grande", "dormitorio", ContenidoEditado), "\"1\"");
        Assert.Equal(HttpStatusCode.OK, actualizado.StatusCode);
        Assert.Equal("\"2\"", actualizado.Headers.ETag?.Tag);
        Assert.Equal(2, (await actualizado.Content.ReadFromJsonAsync<RespuestaDeDiseno>())!.Version);

        // Sin If-Match: 428.
        var sinIfMatch = await PutAsync(cliente, diseno.Id, DisenosDePrueba.Peticion(), ifMatch: null);
        Assert.Equal((HttpStatusCode)428, sinIfMatch.StatusCode);

        // Con el "1" de antes: 412 con la versión actual, y nada cambia.
        var conflicto = await PutAsync(cliente, diseno.Id, DisenosDePrueba.Peticion("Me pisaría"), "\"1\"");
        Assert.Equal(HttpStatusCode.PreconditionFailed, conflicto.StatusCode);
        var detalle = (await conflicto.Content.ReadFromJsonAsync<RespuestaDeVersionDistinta>())!;
        Assert.Equal(2, detalle.Version);
        Assert.Equal("El diseño ha cambiado en otro sitio.", detalle.Mensaje);

        var trasConflicto = (await cliente.GetFromJsonAsync<RespuestaDeDiseno>($"/disenos/{diseno.Id}"))!;
        Assert.Equal("Dormitorio grande", trasConflicto.Nombre);
        Assert.True(MismoJson(ContenidoEditado, trasConflicto.Contenido.GetRawText()));

        // Duplicar: 201, Location y ETag "1" de la copia.
        var copia = await cliente.PostAsync($"/disenos/{diseno.Id}/duplicar", null);
        Assert.Equal(HttpStatusCode.Created, copia.StatusCode);
        Assert.Equal("\"1\"", copia.Headers.ETag?.Tag);
        var duplicado = (await copia.Content.ReadFromJsonAsync<RespuestaDeDiseno>())!;
        Assert.NotEqual(diseno.Id, duplicado.Id);
        Assert.Equal($"/disenos/{duplicado.Id}", copia.Headers.Location?.OriginalString);
        Assert.Equal("Dormitorio grande (copia)", duplicado.Nombre);
        Assert.True(MismoJson(ContenidoEditado, duplicado.Contenido.GetRawText()));

        // Borrar: 204 y después 404.
        Assert.Equal(HttpStatusCode.NoContent, (await cliente.DeleteAsync($"/disenos/{diseno.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync($"/disenos/{diseno.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.DeleteAsync($"/disenos/{diseno.Id}")).StatusCode);
        Assert.Single((await cliente.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);
    }

    [Fact]
    public async Task IfMatch_SinComillas_TambienSeAdmite()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);

        var respuesta = await PutAsync(cliente, id, DisenosDePrueba.Peticion("Otro nombre"), "1");

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Equal("\"2\"", respuesta.Headers.ETag?.Tag);
    }

    /// <summary><c>*</c> sobrescribiría a ciegas: se trata como si no hubiera <c>If-Match</c>.</summary>
    [Fact]
    public async Task IfMatch_Asterisco_Responde428()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);

        var respuesta = await PutAsync(cliente, id, DisenosDePrueba.Peticion("Otro nombre"), "*");

        Assert.Equal((HttpStatusCode)428, respuesta.StatusCode);
    }

    /// <summary>Un valor que no es una versión nunca coincide: 412, no 400 ni 500.</summary>
    [Theory]
    [InlineData("\"abc\"")]
    [InlineData("W/\"1\"")]
    [InlineData("\"99999999999999999999\"")]
    public async Task IfMatch_QueNoEsUnaVersion_Responde412(string ifMatch)
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);

        var respuesta = await PutAsync(cliente, id, DisenosDePrueba.Peticion("Otro nombre"), ifMatch);

        Assert.Equal(HttpStatusCode.PreconditionFailed, respuesta.StatusCode);
        Assert.Equal(1, (await respuesta.Content.ReadFromJsonAsync<RespuestaDeVersionDistinta>())!.Version);
    }

    [Fact]
    public async Task Put_DeUnoQueNoExiste_Responde404()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);

        var respuesta = await PutAsync(cliente, Guid.NewGuid(), DisenosDePrueba.Peticion(), "\"1\"");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task IdQueNoEsUnGuid_Responde404()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);

        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync("/disenos/no-es-un-id")).StatusCode);
    }

    [Fact]
    public async Task SinSesion_401()
    {
        var anonimo = api.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.GetAsync("/disenos")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.GetAsync($"/disenos/{Guid.NewGuid()}")).StatusCode);
    }

    // ------------------------------------------------------- Datos no válidos

    [Theory]
    [InlineData("", "dormitorio")]
    [InlineData("   ", "dormitorio")]
    [InlineData("Mi diseño", "Salón")]
    [InlineData("Mi diseño", "bano")]
    public async Task NombreOTipoNoValidos_Responden400ConMensaje(string nombre, string tipo)
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);

        var respuesta = await cliente.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion(nombre, tipo));

        await AssertRechazoAsync(respuesta);
    }

    /// <summary>
    /// PostgreSQL no admite el carácter nulo en una columna de texto (22021): si
    /// el nombre llegara a la base, sería un 500.
    /// </summary>
    [Fact]
    public async Task NombreConCaracterNulo_Responde400_AlCrearYAlActualizar()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);

        await AssertRechazoAsync(await cliente.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion("a\u0000b")));
        await AssertRechazoAsync(await PutAsync(cliente, id, DisenosDePrueba.Peticion("a\u0000b"), "\"1\""));

        var actual = (await cliente.GetFromJsonAsync<RespuestaDeDiseno>($"/disenos/{id}"))!;
        Assert.Equal("Mi dormitorio", actual.Nombre);
        Assert.Equal(1, actual.Version);
    }

    /// <summary>Un sustituto suelto en el nombre no es texto: 400, nunca 500.</summary>
    [Fact]
    public async Task NombreConSustitutoSuelto_Responde400()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);

        var respuesta = await cliente.PostAsync("/disenos", DisenosDePrueba.CuerpoCrudo(
            $$"""{"nombre":"a\uD800b","tipoEstancia":"salon","contenido":{{DisenosDePrueba.ContenidoMinimo}}}"""));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Empty((await cliente.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);
    }

    [Fact]
    public async Task NombreDemasiadoLargo_Responde400()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);

        var respuesta = await cliente.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion(new string('a', 101)));

        await AssertRechazoAsync(respuesta);
    }

    /// <summary>
    /// Review Focus 3: el contenido es la parte que el servidor no entiende, y
    /// por eso la más fácil de envenenar. Todo lo que no es un diseño admitido
    /// es un 400 con mensaje, nunca un 500.
    /// </summary>
    [Theory]
    [MemberData(nameof(ContenidosHostiles))]
    public async Task ContenidoHostil_Responde400ConMensaje_NuncaUn500(string cuerpo)
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);

        var respuesta = await cliente.PostAsync("/disenos", DisenosDePrueba.CuerpoCrudo(cuerpo));

        await AssertRechazoAsync(respuesta);
        Assert.Empty((await cliente.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);
    }

    /// <summary>Lo mismo al actualizar: el contenido viejo se queda como estaba.</summary>
    [Theory]
    [MemberData(nameof(ContenidosHostiles))]
    public async Task ContenidoHostil_AlActualizar_Responde400YNoCambiaNada(string cuerpo)
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);

        var peticion = new HttpRequestMessage(HttpMethod.Put, $"/disenos/{id}") { Content = DisenosDePrueba.CuerpoCrudo(cuerpo) };
        peticion.Headers.TryAddWithoutValidation("If-Match", "\"1\"");
        var respuesta = await cliente.SendAsync(peticion);

        await AssertRechazoAsync(respuesta);
        var actual = (await cliente.GetFromJsonAsync<RespuestaDeDiseno>($"/disenos/{id}"))!;
        Assert.Equal(1, actual.Version);
        Assert.True(MismoJson(DisenosDePrueba.ContenidoMinimo, actual.Contenido.GetRawText()));
    }

    public static TheoryData<string> ContenidosHostiles()
    {
        const string Envoltorio = """{"nombre":"Hostil","tipoEstancia":"salon","contenido":%}""";
        string Con(string contenido) => Envoltorio.Replace("%", contenido);

        return new TheoryData<string>
        {
            """{"nombre":"Hostil","tipoEstancia":"salon"}""",
            Con("null"),
            Con("""[1,2,3]"""),
            Con("\"una cadena\""),
            Con("42"),
            Con("""{"formato":2,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}"""),
            Con("""{"formato":"1","estancia":{},"aberturas":[],"estructura":[],"elementos":[]}"""),
            Con("""{"formato":1,"estancia":{},"aberturas":[],"estructura":[]}"""),
            Con("""{"formato":1,"estancia":[],"aberturas":[],"estructura":[],"elementos":[]}"""),
            Con("""{"formato":1,"estancia":{"nota":"\uD800"},"aberturas":[],"estructura":[],"elementos":[]}"""),
            Con("""{"formato":1,"estancia":{"nota":"a\u0000b"},"aberturas":[],"estructura":[],"elementos":[]}"""),
            Con("""{"formato":1,"estancia":{"\u0000":1},"aberturas":[],"estructura":[],"elementos":[]}"""),
            Con(DisenosDePrueba.ContenidoDeTamano(ContenidoDeDiseno.TamanoMaximoEnBytes + 1)),
        };
    }

    [Fact]
    public async Task ContenidoJustoEnElLimite_SeAdmite()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var json = DisenosDePrueba.ContenidoDeTamano(ContenidoDeDiseno.TamanoMaximoEnBytes);

        var respuesta = await cliente.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion("Grande", "salon", json));

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
    }

    // ------------------------------------------------------ Diseños ajenos

    /// <summary>
    /// Review Focus 4: un diseño ajeno es indistinguible de uno que no existe,
    /// y ninguna operación sobre él lo toca.
    /// </summary>
    [Fact]
    public async Task DisenoDeOtroUsuario_Responde404EnTodo_YSigueIgual()
    {
        var duena = await CuentasDePrueba.ConSesionAsync(api);
        var intrusa = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(duena, "De la dueña");

        Assert.Equal(HttpStatusCode.NotFound, (await intrusa.GetAsync($"/disenos/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await PutAsync(intrusa, id, DisenosDePrueba.Peticion("Robado", "cocina", ContenidoEditado), "\"1\"")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await PutAsync(intrusa, id, DisenosDePrueba.Peticion("Robado"), "\"abc\"")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await intrusa.DeleteAsync($"/disenos/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await intrusa.PostAsync($"/disenos/{id}/duplicar", null)).StatusCode);
        Assert.Empty((await intrusa.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);

        var intacto = await duena.GetAsync($"/disenos/{id}");
        Assert.Equal(HttpStatusCode.OK, intacto.StatusCode);
        Assert.Equal("\"1\"", intacto.Headers.ETag?.Tag);
        var diseno = (await intacto.Content.ReadFromJsonAsync<RespuestaDeDiseno>())!;
        Assert.Equal("De la dueña", diseno.Nombre);
        Assert.Equal("dormitorio", diseno.TipoEstancia);
        Assert.True(MismoJson(DisenosDePrueba.ContenidoMinimo, diseno.Contenido.GetRawText()));
        Assert.Single((await duena.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);
    }

    // ------------------------------------------------------------- Límite

    [Fact]
    public async Task ElDiseno101_Responde409_TantoAlCrearComoAlDuplicar()
    {
        var correo = $"lleno-{Guid.NewGuid():N}@ejemplo.com";
        var cliente = await CuentasDePrueba.ConSesionAsync(api, correo, "Lleno");
        var primero = await DisenosDePrueba.CrearAsync(cliente);

        // Los otros 99, directamente en la base: cien POST no prueban nada más.
        await RellenarHastaAsync(correo, Diseno.MaximoPorUsuario);

        var creado = await cliente.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion("El 101"));
        await AssertRechazoAsync(creado, HttpStatusCode.Conflict);

        var duplicado = await cliente.PostAsync($"/disenos/{primero}/duplicar", null);
        await AssertRechazoAsync(duplicado, HttpStatusCode.Conflict);

        Assert.Equal(Diseno.MaximoPorUsuario, (await cliente.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!.Count);
    }

    // ---------------------------------------------------------- Auxiliares

    private static Task<HttpResponseMessage> PutAsync(HttpClient cliente, Guid id, PeticionDeDiseno cuerpo, string? ifMatch)
    {
        var peticion = new HttpRequestMessage(HttpMethod.Put, $"/disenos/{id}") { Content = JsonContent.Create(cuerpo) };

        if (ifMatch is not null)
        {
            // Sin validar: hay que poder mandar también valores mal formados.
            peticion.Headers.TryAddWithoutValidation("If-Match", ifMatch);
        }

        return cliente.SendAsync(peticion);
    }

    private static async Task AssertRechazoAsync(HttpResponseMessage respuesta, HttpStatusCode esperado = HttpStatusCode.BadRequest)
    {
        Assert.Equal(esperado, respuesta.StatusCode);
        var error = await respuesta.Content.ReadFromJsonAsync<RespuestaDeError>();
        Assert.False(string.IsNullOrWhiteSpace(error?.Mensaje));
    }

    private static bool MismoJson(string esperado, string obtenido) =>
        JsonNode.DeepEquals(JsonNode.Parse(esperado), JsonNode.Parse(obtenido));

    private async Task RellenarHastaAsync(string correo, int total)
    {
        using var ambito = api.Services.CreateScope();
        var contexto = ambito.ServiceProvider.GetRequiredService<DecorazonDbContext>();
        var usuarioId = await contexto.Usuarios
            .Where(usuario => usuario.Correo == CorreoElectronico.Crear(correo))
            .Select(usuario => usuario.Id)
            .SingleAsync();
        var existentes = await contexto.Disenos.CountAsync(diseno => diseno.UsuarioId == usuarioId);

        NombreDeDiseno.TryCrear("Relleno", out var nombre);
        ContenidoDeDiseno.Validar(DisenosDePrueba.ContenidoMinimo, out var contenido);

        for (var i = existentes; i < total; i++)
        {
            contexto.Disenos.Add(Diseno.Crear(usuarioId, nombre, TipoDeEstancia.Cocina, contenido!, DateTimeOffset.UtcNow));
        }

        await contexto.SaveChangesAsync();
    }
}
