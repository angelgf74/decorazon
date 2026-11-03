using System.Net;
using System.Net.Http.Json;
using Decorazon.Contratos;
using Decorazon.Contratos.Cuentas;

namespace Decorazon.Api.Tests;

/// <summary>
/// Fixture con el límite de registros bajado a dos, para comprobar el rechazo
/// sin tener que lanzar cientos de peticiones.
/// </summary>
public sealed class ApiConLimiteEstrechoFixture : ApiConPostgresFixture
{
    protected override int MaximoDeRegistrosPorVentana => 2;
}

[Trait("Categoria", "Integracion")]
public class LimiteDePeticionesTests(ApiConLimiteEstrechoFixture api)
    : IClassFixture<ApiConLimiteEstrechoFixture>
{
    [Fact]
    public async Task SuperarElLimite_Responde429YDejaDeEnviarCorreos()
    {
        var cliente = api.CreateClient();

        for (var intento = 0; intento < 2; intento++)
        {
            var permitida = await cliente.PostAsJsonAsync("/cuentas/registro",
                new PeticionDeRegistro { Correo = $"permitido-{intento}@ejemplo.com" });

            Assert.Equal(HttpStatusCode.OK, permitida.StatusCode);
        }

        var correosAntes = api.Correo.EnlacesDeAlta.Count;

        var rechazada = await cliente.PostAsJsonAsync("/cuentas/registro",
            new PeticionDeRegistro { Correo = "rechazado@ejemplo.com" });

        Assert.Equal(HttpStatusCode.TooManyRequests, rechazada.StatusCode);

        // Mismo formato que el resto de errores: la web enseña el mensaje tal cual.
        var error = await rechazada.Content.ReadFromJsonAsync<RespuestaDeMensaje>();
        Assert.False(string.IsNullOrWhiteSpace(error?.Mensaje));

        // Lo importante no es el código, sino que la petición rechazada no
        // llegue a generar un envío: el límite existe para no bombardear buzones.
        Assert.Equal(correosAntes, api.Correo.EnlacesDeAlta.Count);
    }
}

/// <summary>
/// Fixture propio: el cubo del limitador se comparte por origen y ventana, así
/// que dos tests dentro de la misma clase se estorbarían entre sí.
/// </summary>
public sealed class ApiConLimiteEstrechoParaContrasenaFixture : ApiConPostgresFixture
{
    protected override int MaximoDeRegistrosPorVentana => 2;
}

[Trait("Categoria", "Integracion")]
public class LimiteCompartidoConElRestablecimientoTests(ApiConLimiteEstrechoParaContrasenaFixture api)
    : IClassFixture<ApiConLimiteEstrechoParaContrasenaFixture>
{
    /// <summary>
    /// El alta y el olvido de contraseña comparten cubo a propósito: los dos
    /// mandan correo a una dirección que no es la de quien llama. Con cubos
    /// separados, un mismo origen duplicaría los envíos alternando entre ambos,
    /// y esta petición habría respondido 200.
    /// </summary>
    [Fact]
    public async Task AgotarElLimiteConElAlta_TambienBloqueaElRestablecimiento()
    {
        var cliente = api.CreateClient();

        for (var intento = 0; intento < 2; intento++)
        {
            var permitida = await cliente.PostAsJsonAsync("/cuentas/registro",
                new PeticionDeRegistro { Correo = $"compartido-{intento}@ejemplo.com" });

            Assert.Equal(HttpStatusCode.OK, permitida.StatusCode);
        }

        var correosAntes = api.Correo.EnlacesDeContrasena.Count;

        var rechazada = await cliente.PostAsJsonAsync("/cuentas/contrasena/olvido",
            new PeticionDeOlvidoDeContrasena { Correo = "compartido-0@ejemplo.com" });

        Assert.Equal(HttpStatusCode.TooManyRequests, rechazada.StatusCode);
        Assert.Equal(correosAntes, api.Correo.EnlacesDeContrasena.Count);
    }
}

/// <summary>
/// Fixture propio: comprobar una contraseña actual es la misma superficie que
/// el inicio de sesión, con su propio cubo.
/// </summary>
public sealed class ApiConLimiteEstrechoParaCambioDeContrasenaFixture : ApiConPostgresFixture
{
    protected override int MaximoDeCambiosDeContrasenaPorVentana => 2;
}

[Trait("Categoria", "Integracion")]
public class LimiteDeCambioDeContrasenaTests(ApiConLimiteEstrechoParaCambioDeContrasenaFixture api)
    : IClassFixture<ApiConLimiteEstrechoParaCambioDeContrasenaFixture>
{
    [Fact]
    public async Task SuperarElLimite_Responde429()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);

        for (var intento = 0; intento < 2; intento++)
        {
            var respuesta = await cliente.PostAsJsonAsync("/cuentas/contrasena", new PeticionDeCambioDeContrasena
            {
                // Deliberadamente incorrecta: lo que se mide es cuántos intentos se
                // dejan hacer, no si acierta. Con la correcta, el segundo intento
                // fallaría por ser ya la contraseña anterior.
                Actual = "no es la correcta",
                Nueva = "otra-contrasena-larga"
            });

            Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        }

        var rechazada = await cliente.PostAsJsonAsync("/cuentas/contrasena", new PeticionDeCambioDeContrasena
        {
            Actual = "no es la correcta",
            Nueva = "otra-contrasena-larga"
        });

        Assert.Equal(HttpStatusCode.TooManyRequests, rechazada.StatusCode);
    }
}

/// <summary>Fixture propio, con la lectura de diseños compartidos bajada a dos por ventana.</summary>
public sealed class ApiConLimiteEstrechoParaLecturaCompartidaFixture : ApiConPostgresFixture
{
    protected override int MaximoDeLecturasCompartidasPorVentana => 2;
}

[Trait("Categoria", "Integracion")]
public class LimiteDeLecturaCompartidaTests(ApiConLimiteEstrechoParaLecturaCompartidaFixture api)
    : IClassFixture<ApiConLimiteEstrechoParaLecturaCompartidaFixture>
{
    [Fact]
    public async Task LeerEnlacesSinParar_Responde429ConMensaje()
    {
        var anonimo = api.CreateClient();

        for (var intento = 0; intento < 2; intento++)
        {
            Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync($"/compartidos/probando{intento}")).StatusCode);
        }

        var rechazada = await anonimo.GetAsync("/compartidos/probando2");

        Assert.Equal(HttpStatusCode.TooManyRequests, rechazada.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace((await rechazada.Content.ReadFromJsonAsync<RespuestaDeMensaje>())?.Mensaje));
    }
}

/// <summary>Fixture propio, con las escrituras con sesión bajadas a tres por ventana.</summary>
public sealed class ApiConLimiteEstrechoParaEscriturasFixture : ApiConPostgresFixture
{
    protected override int MaximoDeEscriturasPorVentana => 3;
}

[Trait("Categoria", "Integracion")]
public class LimiteDeEscriturasTests(ApiConLimiteEstrechoParaEscriturasFixture api)
    : IClassFixture<ApiConLimiteEstrechoParaEscriturasFixture>
{
    /// <summary>
    /// Crear, compartir y subir la vista previa comparten cubo, que se reparte por usuario y no por IP:
    /// otra cuenta desde el mismo origen sigue escribiendo, y leer no cuenta.
    /// </summary>
    [Fact]
    public async Task EscribirSinParar_Responde429SoloAEseUsuario()
    {
        var uno = await CuentasDePrueba.ConSesionAsync(api);
        var otro = await CuentasDePrueba.ConSesionAsync(api);

        var id = await DisenosDePrueba.CrearAsync(uno);
        Assert.Equal(HttpStatusCode.OK, (await uno.PutAsync($"/disenos/{id}/enlace", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await SubirVistaPreviaAsync(uno, id)).StatusCode);

        var rechazada = await SubirVistaPreviaAsync(uno, id);

        Assert.Equal(HttpStatusCode.TooManyRequests, rechazada.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace((await rechazada.Content.ReadFromJsonAsync<RespuestaDeMensaje>())?.Mensaje));
        Assert.Equal(HttpStatusCode.OK, (await uno.GetAsync($"/disenos/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await otro.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion())).StatusCode);
    }

    private static Task<HttpResponseMessage> SubirVistaPreviaAsync(HttpClient cliente, Guid id)
    {
        var cuerpo = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0x00]);
        cuerpo.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        return cliente.PutAsync($"/disenos/{id}/vista-previa", cuerpo);
    }
}

/// <summary>Fixture propio, con las sugerencias bajadas a dos por ventana.</summary>
public sealed class ApiConLimiteEstrechoParaSugerenciasFixture : ApiConPostgresFixture
{
    protected override int MaximoDeSugerenciasPorVentana => 2;
}

[Trait("Categoria", "Integracion")]
public class LimiteDeSugerenciasTests(ApiConLimiteEstrechoParaSugerenciasFixture api)
    : IClassFixture<ApiConLimiteEstrechoParaSugerenciasFixture>
{
    /// <summary>
    /// Sin sesión el cubo es de la IP; con sesión, de la cuenta: quien agota el suyo sin entrar no
    /// deja sin buzón a una cuenta que escribe desde la misma red.
    /// </summary>
    [Fact]
    public async Task EnviarSinParar_Responde429YNoLlegaAlBuzon_SoloEnEseCubo()
    {
        var anonimo = api.CreateClient();
        var conCuenta = await CuentasDePrueba.ConSesionAsync(api);

        for (var intento = 0; intento < 2; intento++)
        {
            Assert.Equal(HttpStatusCode.NoContent, (await EnviarAsync(anonimo, $"permitida {intento}")).StatusCode);
        }

        var rechazada = await EnviarAsync(anonimo, "rechazada");

        Assert.Equal(HttpStatusCode.TooManyRequests, rechazada.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace((await rechazada.Content.ReadFromJsonAsync<RespuestaDeMensaje>())?.Mensaje));
        Assert.Empty(api.Sugerencias.ConTexto("rechazada"));
        Assert.Equal(HttpStatusCode.NoContent, (await EnviarAsync(conCuenta, "de la cuenta")).StatusCode);
    }

    private static Task<HttpResponseMessage> EnviarAsync(HttpClient cliente, string texto) =>
        cliente.PostAsJsonAsync("/sugerencias", new Decorazon.Contratos.Sugerencias.PeticionDeSugerencia
        {
            Texto = texto,
            Tipo = "mejora",
            Correo = "ana@ejemplo.com"
        });
}
