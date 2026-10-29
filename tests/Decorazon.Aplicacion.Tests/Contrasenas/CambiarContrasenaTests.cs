using Microsoft.Extensions.Logging.Abstractions;
using Decorazon.Aplicacion.Contrasenas;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Tests.Contrasenas;

/// <summary>
/// Cambiar la contraseña con la sesión iniciada, sabiendo la actual.
/// </summary>
public class CambiarContrasenaTests
{
    private const string ContrasenaActual = "la de siempre y once";
    private const string ContrasenaNueva = "una frase larga y nueva";
    private const string CorreoDelUsuario = "alguien@ejemplo.com";

    private readonly RepositorioDeUsuariosEnMemoria _usuarios = new();
    private readonly RepositorioDeSolicitudesDeContrasenaEnMemoria _solicitudes = new();
    private readonly EnviadorDeCorreoEspia _correo = new();
    private readonly HasheadorFalso _hasheador = new();
    private readonly RelojFalso _reloj = new(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero));

    private CambiarContrasena CasoDeUso =>
        new(_usuarios, _solicitudes, _hasheador, _correo, _reloj, NullLogger<CambiarContrasena>.Instance);

    [Fact]
    public async Task ConLaActualCorrecta_CambiaLaContrasena()
    {
        var usuario = await DarDeAltaUsuario();

        var resultado = await CasoDeUso.EjecutarAsync(usuario.Id, ContrasenaActual, ContrasenaNueva);

        Assert.Equal(ResultadoDeCambioDeContrasena.Correcto, resultado);
        Assert.True(_hasheador.Verificar(ContrasenaNueva, usuario.HashDeContrasena));
    }

    /// <summary>Criterio de aceptación explícito: la contraseña anterior deja de valer.</summary>
    [Fact]
    public async Task DespuesDeCambiar_LaContrasenaAnteriorYaNoVale()
    {
        var usuario = await DarDeAltaUsuario();

        Assert.True(_hasheador.Verificar(ContrasenaActual, usuario.HashDeContrasena));

        await CasoDeUso.EjecutarAsync(usuario.Id, ContrasenaActual, ContrasenaNueva);

        Assert.False(_hasheador.Verificar(ContrasenaActual, usuario.HashDeContrasena));
    }

    [Fact]
    public async Task ConLaActualIncorrecta_NoCambiaNada()
    {
        var usuario = await DarDeAltaUsuario();
        var hashOriginal = usuario.HashDeContrasena;

        var resultado = await CasoDeUso.EjecutarAsync(usuario.Id, "esta no es", ContrasenaNueva);

        Assert.Equal(ResultadoDeCambioDeContrasena.CredencialesIncorrectas, resultado);
        Assert.Equal(hashOriginal, usuario.HashDeContrasena);
        Assert.Empty(_correo.ConfirmacionesDeCambioDeContrasena);
    }

    [Fact]
    public async Task SiLaCuentaSeBorraAntesDeGuardar_CredencialesIncorrectasYSinAviso()
    {
        var usuario = await DarDeAltaUsuario();
        _usuarios.OtroSeAdelanta = true;

        var resultado = await CasoDeUso.EjecutarAsync(usuario.Id, ContrasenaActual, ContrasenaNueva);

        Assert.Equal(ResultadoDeCambioDeContrasena.CredencialesIncorrectas, resultado);
        Assert.Empty(_correo.ConfirmacionesDeCambioDeContrasena);
    }

    [Fact]
    public async Task UsuarioInexistente_RespondeLoMismoQueUnaContrasenaIncorrecta()
    {
        var resultado = await CasoDeUso.EjecutarAsync(Guid.NewGuid(), ContrasenaActual, ContrasenaNueva);

        Assert.Equal(ResultadoDeCambioDeContrasena.CredencialesIncorrectas, resultado);
    }

    [Fact]
    public async Task ContrasenaNuevaDemasiadoCorta_NoCambiaNada()
    {
        var usuario = await DarDeAltaUsuario();
        var hashOriginal = usuario.HashDeContrasena;

        var resultado = await CasoDeUso.EjecutarAsync(
            usuario.Id, ContrasenaActual, new string('x', Contrasena.LongitudMinima - 1));

        Assert.Equal(ResultadoDeCambioDeContrasena.ContrasenaNoValida, resultado);
        Assert.Equal(hashOriginal, usuario.HashDeContrasena);
        Assert.Empty(_correo.ConfirmacionesDeCambioDeContrasena);
    }

    [Fact]
    public async Task AlCambiar_AvisaPorCorreoALaCuenta()
    {
        var usuario = await DarDeAltaUsuario();

        await CasoDeUso.EjecutarAsync(usuario.Id, ContrasenaActual, ContrasenaNueva);

        Assert.Equal(CorreoDelUsuario, Assert.Single(_correo.ConfirmacionesDeCambioDeContrasena));
    }

    [Fact]
    public async Task SiElCorreoFalla_ElCambioSeMantiene()
    {
        var usuario = await DarDeAltaUsuario();
        _correo.FallaAlEnviar = true;

        var resultado = await CasoDeUso.EjecutarAsync(usuario.Id, ContrasenaActual, ContrasenaNueva);

        // El aviso es una cortesía de seguridad, no una condición: si se pierde,
        // la contraseña sigue cambiada.
        Assert.Equal(ResultadoDeCambioDeContrasena.Correcto, resultado);
        Assert.True(_hasheador.Verificar(ContrasenaNueva, usuario.HashDeContrasena));
    }

    [Fact]
    public async Task SeAnotaCuandoSeCambio()
    {
        var usuario = await DarDeAltaUsuario();
        _reloj.Avanzar(TimeSpan.FromMinutes(10));

        await CasoDeUso.EjecutarAsync(usuario.Id, ContrasenaActual, ContrasenaNueva);

        Assert.Equal(_reloj.Ahora, usuario.FechaDeCambioDeContrasena);
    }

    [Fact]
    public async Task AlCambiar_InvalidaLosEnlacesDeRestablecimientoVivos()
    {
        var usuario = await DarDeAltaUsuario();
        var solicitud = SolicitudDeContrasena.Crear(usuario.Id, "hash(token)", _reloj.Ahora);
        await _solicitudes.AnadirAsync(solicitud);

        await CasoDeUso.EjecutarAsync(usuario.Id, ContrasenaActual, ContrasenaNueva);

        Assert.False(solicitud.EstaVigente(_reloj.Ahora));
    }

    [Fact]
    public async Task ConLaActualIncorrecta_NoTocaLosEnlacesVivos()
    {
        var usuario = await DarDeAltaUsuario();
        var solicitud = SolicitudDeContrasena.Crear(usuario.Id, "hash(token)", _reloj.Ahora);
        await _solicitudes.AnadirAsync(solicitud);

        await CasoDeUso.EjecutarAsync(usuario.Id, "esta no es", ContrasenaNueva);

        Assert.True(solicitud.EstaVigente(_reloj.Ahora));
    }

    private async Task<Usuario> DarDeAltaUsuario()
    {
        var usuario = Usuario.Crear(
            CorreoElectronico.Crear(CorreoDelUsuario), NombreDeUsuario.Crear("Ana"),
            $"hash({ContrasenaActual})", _reloj.Ahora);
        await _usuarios.AnadirAsync(usuario);

        return usuario;
    }
}
