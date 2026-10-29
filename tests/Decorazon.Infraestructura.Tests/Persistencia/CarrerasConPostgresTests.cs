using Decorazon.Aplicacion.Contrasenas;
using Decorazon.Aplicacion.Disenos;
using Decorazon.Aplicacion.Registro;
using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Correo;
using Decorazon.Infraestructura.Persistencia;
using Decorazon.Infraestructura.Seguridad;
using Decorazon.Infraestructura.Tiempo;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Decorazon.Infraestructura.Tests.Persistencia;

/// <summary>
/// Carreras reales contra PostgreSQL, a nivel de caso de uso: otro contexto escribe
/// entre la lectura y el guardado (<see cref="CarreraAntesDeGuardar"/>). Ninguna
/// debe acabar en una excepción de EF o de Npgsql: el adaptador las traduce a un
/// resultado del puerto y el caso de uso responde lo que corresponde.
/// </summary>
[Collection(ColeccionPostgres.Nombre)]
[Trait("Categoria", "Integracion")]
public sealed class CarrerasConPostgresTests(PostgresFixture postgres)
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 25, 12, 0, 0, TimeSpan.Zero);

    private const string Json =
        """{"formato":1,"estancia":{"ancho":400},"aberturas":[],"estructura":[],"elementos":[]}""";

    private static PeticionDeDiseno Peticion(string nombre) => new(nombre, "salon", Json);

    private async Task<(string Cadena, Usuario Usuario, Diseno Diseno)> BaseConDisenoAsync()
    {
        var cadena = await postgres.NuevaBaseAsync();
        var usuario = Usuario.Crear(
            CorreoElectronico.Crear("ana@example.com"), NombreDeUsuario.Crear("Ana"), "hash", Ahora);
        ContenidoDeDiseno.Validar(Json, out var contenido);
        NombreDeDiseno.TryCrear("Original", out var nombre);
        var diseno = Diseno.Crear(usuario.Id, nombre, TipoDeEstancia.Salon, contenido!, Ahora);

        await using var contexto = PostgresFixture.Contexto(cadena);
        contexto.Usuarios.Add(usuario);
        contexto.Disenos.Add(diseno);
        await contexto.SaveChangesAsync();

        return (cadena, usuario, diseno);
    }

    private static GestionDeDisenos Gestion(DecorazonDbContext contexto) =>
        new(new RepositorioDeDisenosEf(contexto), new RelojDelSistema());

    // ------------------------------------------------------------ Actualizar

    [Fact]
    public async Task Actualizar_si_otro_lo_cambia_entre_leer_y_guardar_devuelve_VersionDistinta_con_el_actual()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(async () =>
        {
            await using var otro = PostgresFixture.Contexto(cadena);
            var resultadoDelOtro = await Gestion(otro).ActualizarAsync(usuario.Id, diseno.Id, 1, Peticion("Del otro"));
            Assert.Equal(EstadoDeDiseno.Correcto, resultadoDelOtro.Estado);
        });
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Gestion(contexto).ActualizarAsync(usuario.Id, diseno.Id, 1, Peticion("Mío"));

        Assert.True(carrera.Ocurrio);
        Assert.Equal(EstadoDeDiseno.VersionDistinta, resultado.Estado);
        Assert.Equal(2, resultado.Diseno!.Version);
        Assert.Equal("Del otro", resultado.Diseno.Nombre.Valor);

        await using var lectura = PostgresFixture.Contexto(cadena);
        var guardado = await lectura.Disenos.SingleAsync();
        Assert.Equal("Del otro", guardado.Nombre.Valor);
        Assert.Equal(2, guardado.Version);
    }

    [Fact]
    public async Task Actualizar_si_otro_lo_borra_entre_leer_y_guardar_devuelve_NoEncontrado()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(() => BorrarDisenosAsync(cadena));
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Gestion(contexto).ActualizarAsync(usuario.Id, diseno.Id, 1, Peticion("Mío"));

        Assert.True(carrera.Ocurrio);
        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
    }

    // ------------------------------------------------------------ Borrar

    [Fact]
    public async Task Borrar_si_otro_lo_borra_antes_devuelve_false()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(() => BorrarDisenosAsync(cadena));
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        Assert.False(await Gestion(contexto).BorrarAsync(usuario.Id, diseno.Id));
        Assert.True(carrera.Ocurrio);
    }

    [Fact]
    public async Task Borrar_si_otro_lo_cambia_antes_devuelve_false_y_no_lo_borra()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(async () =>
        {
            await using var otro = PostgresFixture.Contexto(cadena);
            await Gestion(otro).ActualizarAsync(usuario.Id, diseno.Id, 1, Peticion("Del otro"));
        });
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        Assert.False(await Gestion(contexto).BorrarAsync(usuario.Id, diseno.Id));

        await using var lectura = PostgresFixture.Contexto(cadena);
        Assert.Equal("Del otro", (await lectura.Disenos.SingleAsync()).Nombre.Valor);
    }

    // ------------------------------------------------- Crear con la cuenta borrándose

    [Fact]
    public async Task Crear_si_la_cuenta_se_borra_entre_contar_y_guardar_devuelve_NoEncontrado()
    {
        var (cadena, usuario, _) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(() => BorrarUsuariosAsync(cadena));
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Gestion(contexto).CrearAsync(usuario.Id, Peticion("Nuevo"));

        Assert.True(carrera.Ocurrio);
        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
    }

    [Fact]
    public async Task Duplicar_si_la_cuenta_se_borra_entre_leer_y_guardar_devuelve_NoEncontrado()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(() => BorrarUsuariosAsync(cadena));
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Gestion(contexto).DuplicarAsync(usuario.Id, diseno.Id);

        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
    }

    // ------------------------------------------------- Alta y contraseña: unicidad y un solo uso

    private static readonly GeneradorDeTokensAleatorios Tokens = new();
    private static readonly HasheadorPbkdf2 Hasheador = new();

    private static CompletarRegistro Completar(DecorazonDbContext contexto) =>
        new(
            new RepositorioDeUsuariosEf(contexto),
            new RepositorioDeDisenosEf(contexto),
            new RepositorioDeSolicitudesDeRegistroEf(contexto),
            Tokens,
            Hasheador,
            new RelojDelSistema());

    private static RestablecerContrasena Restablecer(DecorazonDbContext contexto) =>
        new(
            new RepositorioDeUsuariosEf(contexto),
            new RepositorioDeSolicitudesDeContrasenaEf(contexto),
            Tokens,
            Hasheador,
            new RelojDelSistema());

    /// <summary>Guarda solicitudes de alta vivas para ese correo y devuelve sus tokens.</summary>
    private static async Task<string[]> SolicitudesDeAltaAsync(string cadena, string correo, int cuantas)
    {
        var tokens = Enumerable.Range(0, cuantas).Select(_ => Tokens.GenerarToken()).ToArray();
        await using var contexto = PostgresFixture.Contexto(cadena);
        foreach (var token in tokens)
        {
            contexto.SolicitudesDeRegistro.Add(SolicitudDeRegistro.Crear(
                CorreoElectronico.Crear(correo), Tokens.Hashear(token), null, DateTimeOffset.UtcNow));
        }

        await contexto.SaveChangesAsync();
        return tokens;
    }

    private static async Task<string> SolicitudDeContrasenaAsync(string cadena, Guid usuarioId)
    {
        var token = Tokens.GenerarToken();
        await using var contexto = PostgresFixture.Contexto(cadena);
        contexto.SolicitudesDeContrasena.Add(
            SolicitudDeContrasena.Crear(usuarioId, Tokens.Hashear(token), DateTimeOffset.UtcNow));
        await contexto.SaveChangesAsync();
        return token;
    }

    [Fact]
    public async Task Dos_altas_simultaneas_del_mismo_correo_crean_una_sola_cuenta_y_la_otra_es_EnlaceNoValido()
    {
        var cadena = await postgres.NuevaBaseAsync();
        var tokens = await SolicitudesDeAltaAsync(cadena, "doble@example.com", 2);
        ResultadoDeCompletarRegistro? delOtro = null;
        var carrera = new CarreraAntesDeGuardar(async () =>
        {
            await using var otro = PostgresFixture.Contexto(cadena);
            delOtro = await Completar(otro).EjecutarAsync(tokens[1], "Otra", "otra contraseña larga");
        });
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Completar(contexto).EjecutarAsync(tokens[0], "Una", "una contraseña larga");

        Assert.Equal(ResultadoDeCompletarRegistro.Completado, delOtro);
        Assert.Equal(ResultadoDeCompletarRegistro.EnlaceNoValido, resultado);
        await using var lectura = PostgresFixture.Contexto(cadena);
        Assert.Equal("Otra", (await lectura.Usuarios.SingleAsync()).Nombre.Valor);
    }

    [Fact]
    public async Task El_mismo_enlace_de_alta_usado_dos_veces_a_la_vez_crea_una_sola_cuenta()
    {
        var cadena = await postgres.NuevaBaseAsync();
        var token = (await SolicitudesDeAltaAsync(cadena, "mismo@example.com", 1))[0];
        ResultadoDeCompletarRegistro? delOtro = null;
        var carrera = new CarreraAntesDeGuardar(async () =>
        {
            await using var otro = PostgresFixture.Contexto(cadena);
            delOtro = await Completar(otro).EjecutarAsync(token, "Otra", "otra contraseña larga");
        });
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Completar(contexto).EjecutarAsync(token, "Una", "una contraseña larga");

        Assert.Equal(ResultadoDeCompletarRegistro.Completado, delOtro);
        Assert.Equal(ResultadoDeCompletarRegistro.EnlaceNoValido, resultado);
        await using var lectura = PostgresFixture.Contexto(cadena);
        Assert.Single(await lectura.Usuarios.ToListAsync());
    }

    [Fact]
    public async Task El_mismo_enlace_de_contrasena_usado_dos_veces_a_la_vez_solo_cambia_la_contrasena_una_vez()
    {
        var (cadena, usuario, _) = await BaseConDisenoAsync();
        var token = await SolicitudDeContrasenaAsync(cadena, usuario.Id);
        ResultadoDeRestablecerContrasena? delOtro = null;
        var carrera = new CarreraAntesDeGuardar(async () =>
        {
            await using var otro = PostgresFixture.Contexto(cadena);
            delOtro = await Restablecer(otro).EjecutarAsync(token, "la contraseña del otro");
        });
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Restablecer(contexto).EjecutarAsync(token, "la contraseña mía");

        Assert.Equal(ResultadoDeRestablecerContrasena.Restablecida, delOtro);
        Assert.Equal(ResultadoDeRestablecerContrasena.EnlaceNoValido, resultado);
        await using var lectura = PostgresFixture.Contexto(cadena);
        var guardado = await lectura.Usuarios.SingleAsync();
        Assert.True(Hasheador.Verificar("la contraseña del otro", guardado.HashDeContrasena));
        Assert.Equal(2, guardado.VersionDeCredenciales);
    }

    [Fact]
    public async Task Pedir_otro_enlace_mientras_se_usa_el_anterior_no_falla_y_guarda_el_nuevo()
    {
        var (cadena, usuario, _) = await BaseConDisenoAsync();
        var anterior = await SolicitudDeContrasenaAsync(cadena, usuario.Id);

        // La invalidación del anterior choca con su consumo simultáneo: ya no está vivo,
        // que es justo lo que se quería, y la solicitud nueva debe guardarse igual.
        var carrera = new CarreraAntesDeGuardar(async () =>
        {
            await using var otro = PostgresFixture.Contexto(cadena);
            Assert.Equal(
                ResultadoDeRestablecerContrasena.Restablecida,
                await Restablecer(otro).EjecutarAsync(anterior, "la contraseña del otro"));
        });
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);
        var solicitar = new SolicitarRestablecerContrasena(
            new RepositorioDeUsuariosEf(contexto),
            new RepositorioDeSolicitudesDeContrasenaEf(contexto),
            Tokens,
            new EnviadorDeCorreoDeConsola(NullLogger<EnviadorDeCorreoDeConsola>.Instance),
            new RelojDelSistema());

        var resultado = await solicitar.EjecutarAsync("ana@example.com", token => token);

        Assert.True(carrera.Ocurrio);
        Assert.Equal(ResultadoDeSolicitudDeContrasena.Aceptada, resultado);
        await using var lectura = PostgresFixture.Contexto(cadena);
        Assert.Equal(2, await lectura.SolicitudesDeContrasena.CountAsync());
    }

    [Theory]
    [InlineData(typeof(SolicitudDeRegistro))]
    [InlineData(typeof(SolicitudDeContrasena))]
    public void La_fecha_de_consumo_es_token_de_concurrencia(Type entidad)
    {
        using var contexto = PostgresFixture.Contexto("Host=localhost");

        var propiedad = contexto.Model.FindEntityType(entidad)!.FindProperty("FechaDeConsumo")!;

        Assert.True(propiedad.IsConcurrencyToken);
    }

    private static async Task BorrarDisenosAsync(string cadena)
    {
        await using var otro = PostgresFixture.Contexto(cadena);
        await otro.Disenos.ExecuteDeleteAsync();
    }

    private static async Task BorrarUsuariosAsync(string cadena)
    {
        await using var otro = PostgresFixture.Contexto(cadena);
        await otro.Usuarios.ExecuteDeleteAsync();
    }
}
