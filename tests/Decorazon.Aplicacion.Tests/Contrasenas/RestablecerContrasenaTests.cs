using Decorazon.Aplicacion.Contrasenas;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Tests.Contrasenas;

public class RestablecerContrasenaTests
{
    private const string ContrasenaNueva = "una frase larga y nueva";
    private const string HashOriginal = "hash(la de siempre)";

    private readonly RepositorioDeUsuariosEnMemoria _usuarios = new();
    private readonly RepositorioDeSolicitudesDeContrasenaEnMemoria _solicitudes = new();
    private readonly GeneradorDeTokensPredecible _tokens = new();
    private readonly EnviadorDeCorreoEspia _correo = new();
    private readonly HasheadorFalso _hasheador = new();
    private readonly RelojFalso _reloj = new(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero));

    private RestablecerContrasena CasoDeUso =>
        new(_usuarios, _solicitudes, _tokens, _hasheador, _reloj);

    private static string Enlace(string token) => $"https://decorazon.example/contrasena/nueva?token={token}";

    [Fact]
    public async Task ConTokenValido_CambiaLaContrasena()
    {
        var (usuario, token) = await PedirRestablecimiento();

        var resultado = await CasoDeUso.EjecutarAsync(token, ContrasenaNueva);

        Assert.Equal(ResultadoDeRestablecerContrasena.Restablecida, resultado);
        Assert.True(_hasheador.Verificar(ContrasenaNueva, usuario.HashDeContrasena));
    }

    /// <summary>Criterio de aceptación explícito: la contraseña anterior deja de valer.</summary>
    [Fact]
    public async Task DespuesDeRestablecer_LaContrasenaAnteriorYaNoVale()
    {
        var (usuario, token) = await PedirRestablecimiento();

        // Antes valía: si no se comprueba, el test podría pasar por un montaje mal hecho.
        Assert.True(_hasheador.Verificar("la de siempre", usuario.HashDeContrasena));

        await CasoDeUso.EjecutarAsync(token, ContrasenaNueva);

        Assert.False(_hasheador.Verificar("la de siempre", usuario.HashDeContrasena));
    }

    [Fact]
    public async Task ElMismoToken_NoSirveDosVeces()
    {
        var (_, token) = await PedirRestablecimiento();
        var casoDeUso = CasoDeUso;

        Assert.Equal(
            ResultadoDeRestablecerContrasena.Restablecida,
            await casoDeUso.EjecutarAsync(token, ContrasenaNueva));

        Assert.Equal(
            ResultadoDeRestablecerContrasena.EnlaceNoValido,
            await casoDeUso.EjecutarAsync(token, "otra frase distinta"));
    }

    [Fact]
    public async Task SiElMismoEnlaceSeUsaALaVezYElOtroGuardaAntes_EnlaceNoValido()
    {
        var (_, token) = await PedirRestablecimiento();
        _usuarios.OtroSeAdelanta = true;

        var resultado = await CasoDeUso.EjecutarAsync(token, ContrasenaNueva);

        Assert.Equal(ResultadoDeRestablecerContrasena.EnlaceNoValido, resultado);
    }

    [Fact]
    public async Task TokenCaducado_NoCambiaNada()
    {
        var (usuario, token) = await PedirRestablecimiento();

        _reloj.Avanzar(SolicitudDeContrasena.Vigencia);

        var resultado = await CasoDeUso.EjecutarAsync(token, ContrasenaNueva);

        Assert.Equal(ResultadoDeRestablecerContrasena.EnlaceNoValido, resultado);
        Assert.Equal(HashOriginal, usuario.HashDeContrasena);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("token-inventado")]
    public async Task TokenInexistenteOManipulado_RespondeLoMismoQueUnoCaducado(string token)
    {
        await PedirRestablecimiento();

        var resultado = await CasoDeUso.EjecutarAsync(token, ContrasenaNueva);

        Assert.Equal(ResultadoDeRestablecerContrasena.EnlaceNoValido, resultado);
    }

    [Fact]
    public async Task ContrasenaDemasiadoCorta_NoCambiaNada()
    {
        var (usuario, token) = await PedirRestablecimiento();

        var resultado = await CasoDeUso.EjecutarAsync(token, new string('x', Contrasena.LongitudMinima - 1));

        Assert.Equal(ResultadoDeRestablecerContrasena.ContrasenaNoValida, resultado);
        Assert.Equal(HashOriginal, usuario.HashDeContrasena);
    }

    /// <summary>
    /// Equivocarse al teclear no puede quemar el enlace: obligaría a pedir otro
    /// y a esperar otro correo por un error sin consecuencias.
    /// </summary>
    [Fact]
    public async Task ContrasenaNoValida_NoConsumeElEnlace()
    {
        var (usuario, token) = await PedirRestablecimiento();
        var casoDeUso = CasoDeUso;

        await casoDeUso.EjecutarAsync(token, "corta");

        Assert.False(_solicitudes.Todas.Single().EstaConsumida);

        // Y el enlace sigue sirviendo a la segunda.
        Assert.Equal(
            ResultadoDeRestablecerContrasena.Restablecida,
            await casoDeUso.EjecutarAsync(token, ContrasenaNueva));

        Assert.True(_hasheador.Verificar(ContrasenaNueva, usuario.HashDeContrasena));
    }

    [Fact]
    public async Task ElTokenDeOtroUsuario_SoloCambiaLaContrasenaDeSuDueno()
    {
        var (uno, tokenDeUno) = await PedirRestablecimiento("uno@ejemplo.com");
        var otro = await DarDeAltaUsuario("otro@ejemplo.com");

        await CasoDeUso.EjecutarAsync(tokenDeUno, ContrasenaNueva);

        Assert.True(_hasheador.Verificar(ContrasenaNueva, uno.HashDeContrasena));
        Assert.Equal(HashOriginal, otro.HashDeContrasena);
    }

    [Fact]
    public async Task SeAnotaCuandoSeCambio()
    {
        var (usuario, token) = await PedirRestablecimiento();
        _reloj.Avanzar(TimeSpan.FromMinutes(10));

        await CasoDeUso.EjecutarAsync(token, ContrasenaNueva);

        Assert.Equal(_reloj.Ahora, usuario.FechaDeCambioDeContrasena);
    }

    [Fact]
    public async Task AlRestablecer_InvalidaLosDemasEnlacesVivosDelUsuario()
    {
        var (usuario, primero) = await PedirRestablecimiento();
        var otra = SolicitudDeContrasena.Crear(usuario.Id, "hash(otro-token)", _reloj.Ahora);
        await _solicitudes.AnadirAsync(otra);

        await CasoDeUso.EjecutarAsync(primero, ContrasenaNueva);

        Assert.False(otra.EstaVigente(_reloj.Ahora));
        Assert.Equal(
            ResultadoDeRestablecerContrasena.EnlaceNoValido,
            await CasoDeUso.EjecutarAsync("otro-token", "otra frase distinta"));
    }

    private async Task<(Usuario Usuario, string Token)> PedirRestablecimiento(
        string correo = "alguien@ejemplo.com")
    {
        var usuario = await DarDeAltaUsuario(correo);

        var solicitar = new SolicitarRestablecerContrasena(
            _usuarios, _solicitudes, _tokens, _correo, _reloj);

        await solicitar.EjecutarAsync(correo, Enlace);

        return (usuario, _tokens.UltimoTokenGenerado);
    }

    private async Task<Usuario> DarDeAltaUsuario(string correo)
    {
        var usuario = Usuario.Crear(CorreoElectronico.Crear(correo), NombreDeUsuario.Crear("Ana"), HashOriginal, _reloj.Ahora);
        await _usuarios.AnadirAsync(usuario);

        return usuario;
    }
}
