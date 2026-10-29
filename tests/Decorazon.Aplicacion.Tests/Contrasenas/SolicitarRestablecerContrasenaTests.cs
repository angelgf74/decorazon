using Decorazon.Aplicacion.Contrasenas;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Tests.Contrasenas;

public class SolicitarRestablecerContrasenaTests
{
    private readonly RepositorioDeUsuariosEnMemoria _usuarios = new();
    private readonly RepositorioDeSolicitudesDeContrasenaEnMemoria _solicitudes = new();
    private readonly GeneradorDeTokensPredecible _tokens = new();
    private readonly EnviadorDeCorreoEspia _correo = new();
    private readonly RelojFalso _reloj = new(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero));

    private SolicitarRestablecerContrasena CasoDeUso =>
        new(_usuarios, _solicitudes, _tokens, _correo, _reloj);

    private static string Enlace(string token) => $"https://decorazon.example/contrasena/nueva?token={token}";

    [Fact]
    public async Task CorreoConCuenta_CreaSolicitudYEnviaEnlace()
    {
        var usuario = await DarDeAltaUsuario("alguien@ejemplo.com");

        var resultado = await CasoDeUso.EjecutarAsync("Alguien@Ejemplo.COM", Enlace);

        Assert.Equal(ResultadoDeSolicitudDeContrasena.Aceptada, resultado);
        var solicitud = Assert.Single(_solicitudes.Todas);
        Assert.Equal(usuario.Id, solicitud.UsuarioId);

        var envio = Assert.Single(_correo.EnlacesDeContrasena);
        Assert.Equal("alguien@ejemplo.com", envio.Destinatario);
        Assert.Contains(_tokens.UltimoTokenGenerado, envio.Enlace);
    }

    [Fact]
    public async Task SiElProveedorDeCorreoFalla_CorreoNoEnviado()
    {
        await DarDeAltaUsuario("alguien@ejemplo.com");
        _correo.ProveedorCaido = true;

        var resultado = await CasoDeUso.EjecutarAsync("alguien@ejemplo.com", Enlace);

        Assert.Equal(ResultadoDeSolicitudDeContrasena.CorreoNoEnviado, resultado);
    }

    [Fact]
    public async Task CuartaSolicitudEnUnaHora_RespondeAceptadaPeroNoCreaNiEnvia()
    {
        await DarDeAltaUsuario("alguien@ejemplo.com");
        var casoDeUso = CasoDeUso;

        for (var i = 0; i < SolicitarRestablecerContrasena.MaximoDeSolicitudesPorHora; i++)
        {
            Assert.Equal(ResultadoDeSolicitudDeContrasena.Aceptada, await casoDeUso.EjecutarAsync("alguien@ejemplo.com", Enlace));
        }

        var cuarta = await casoDeUso.EjecutarAsync("alguien@ejemplo.com", Enlace);

        // La misma respuesta que siempre: un 429 aquí delataría que el correo tiene cuenta.
        Assert.Equal(ResultadoDeSolicitudDeContrasena.Aceptada, cuarta);
        Assert.Equal(3, _solicitudes.Todas.Count);
        Assert.Equal(3, _correo.EnlacesDeContrasena.Count);
    }

    [Fact]
    public async Task PasadaLaHora_VuelveAEnviar()
    {
        await DarDeAltaUsuario("alguien@ejemplo.com");
        var casoDeUso = CasoDeUso;
        for (var i = 0; i < SolicitarRestablecerContrasena.MaximoDeSolicitudesPorHora; i++)
        {
            await casoDeUso.EjecutarAsync("alguien@ejemplo.com", Enlace);
        }

        _reloj.Avanzar(TimeSpan.FromHours(1) + TimeSpan.FromMinutes(1));
        await casoDeUso.EjecutarAsync("alguien@ejemplo.com", Enlace);

        Assert.Equal(4, _correo.EnlacesDeContrasena.Count);
    }

    [Fact]
    public async Task CorreoSinCuenta_NoCreaNadaNiEnviaNada()
    {
        var resultado = await CasoDeUso.EjecutarAsync("desconocido@ejemplo.com", Enlace);

        // A diferencia del alta, aquí no se avisa a nadie: un correo a quien no
        // tiene cuenta sería ruido, y confirmaría que el intento llegó a alguna parte.
        Assert.Equal(ResultadoDeSolicitudDeContrasena.Aceptada, resultado);
        Assert.Empty(_solicitudes.Todas);
        Assert.Empty(_correo.EnlacesDeContrasena);
        Assert.Empty(_correo.AvisosDeCuentaExistente);
        Assert.Empty(_correo.EnlacesDeAlta);
    }

    [Fact]
    public async Task CorreoInvalido_NoCreaNadaNiEnvia()
    {
        var resultado = await CasoDeUso.EjecutarAsync("esto-no-es-un-correo", Enlace);

        Assert.Equal(ResultadoDeSolicitudDeContrasena.CorreoInvalido, resultado);
        Assert.Empty(_solicitudes.Todas);
        Assert.Empty(_correo.EnlacesDeContrasena);
    }

    /// <summary>
    /// El criterio de aceptación central del paso 1: la respuesta no puede
    /// depender de si el correo tenía cuenta.
    /// </summary>
    [Fact]
    public async Task ElResultado_EsIdentico_ExistaONoLaCuenta()
    {
        await DarDeAltaUsuario("existente@ejemplo.com");

        var conCuenta = await CasoDeUso.EjecutarAsync("existente@ejemplo.com", Enlace);
        var sinCuenta = await CasoDeUso.EjecutarAsync("desconocido@ejemplo.com", Enlace);

        Assert.Equal(conCuenta, sinCuenta);
    }

    [Fact]
    public async Task SolicitarDeNuevo_InvalidaElEnlaceAnterior()
    {
        await DarDeAltaUsuario("alguien@ejemplo.com");
        var casoDeUso = CasoDeUso;

        await casoDeUso.EjecutarAsync("alguien@ejemplo.com", Enlace);
        var primera = _solicitudes.Todas.Single();

        _reloj.Avanzar(TimeSpan.FromMinutes(5));
        await casoDeUso.EjecutarAsync("alguien@ejemplo.com", Enlace);

        Assert.Equal(2, _solicitudes.Todas.Count);
        Assert.False(primera.EstaVigente(_reloj.Ahora));
        Assert.True(_solicitudes.Todas[1].EstaVigente(_reloj.Ahora));
    }

    [Fact]
    public async Task LaSolicitudDeOtroUsuario_NoSeInvalida()
    {
        await DarDeAltaUsuario("uno@ejemplo.com");
        await DarDeAltaUsuario("otro@ejemplo.com");
        var casoDeUso = CasoDeUso;

        await casoDeUso.EjecutarAsync("uno@ejemplo.com", Enlace);
        var deUno = _solicitudes.Todas.Single();

        await casoDeUso.EjecutarAsync("otro@ejemplo.com", Enlace);

        Assert.True(deUno.EstaVigente(_reloj.Ahora));
    }

    [Fact]
    public async Task ElTokenNoSeGuardaEnClaro()
    {
        await DarDeAltaUsuario("alguien@ejemplo.com");

        await CasoDeUso.EjecutarAsync("alguien@ejemplo.com", Enlace);

        var solicitud = _solicitudes.Todas.Single();

        // El token sí viaja en el enlace; lo que no puede es quedarse en la tabla.
        Assert.Contains(_tokens.UltimoTokenGenerado, _correo.EnlacesDeContrasena.Single().Enlace);
        Assert.NotEqual(_tokens.UltimoTokenGenerado, solicitud.HashDelToken);
        Assert.Equal(_tokens.Hashear(_tokens.UltimoTokenGenerado), solicitud.HashDelToken);
    }

    private async Task<Usuario> DarDeAltaUsuario(string correo)
    {
        var usuario = Usuario.Crear(CorreoElectronico.Crear(correo), NombreDeUsuario.Crear("Ana"), "hash", _reloj.Ahora);
        await _usuarios.AnadirAsync(usuario);

        return usuario;
    }
}
