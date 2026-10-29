using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Tests.Usuarios;

public class UsuarioTests
{
    private static readonly DateTimeOffset Alta = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private static Usuario Crear() =>
        Usuario.Crear(
            CorreoElectronico.Crear("alguien@ejemplo.com"),
            NombreDeUsuario.Crear("Ana Pérez"),
            "hash-original",
            Alta);

    [Fact]
    public void ReciénCreado_NoTieneFechaDeCambioDeContrasena()
    {
        Assert.Null(Crear().FechaDeCambioDeContrasena);
    }

    /// <summary>
    /// Nunca 0: así un JWT sin este claim o con un valor puesto a mano nunca
    /// coincide por accidente con una cuenta real.
    /// </summary>
    [Fact]
    public void ReciénCreado_TieneVersionDeCredencialesUno()
    {
        Assert.Equal(1, Crear().VersionDeCredenciales);
    }

    [Fact]
    public void CambiarContrasena_SubeLaVersionDeCredenciales()
    {
        var usuario = Crear();

        usuario.CambiarContrasena("hash-nuevo", Alta.AddDays(30));

        Assert.Equal(2, usuario.VersionDeCredenciales);
    }

    [Fact]
    public void InvalidarSesiones_SubeLaVersionDeCredencialesSinTocarLaContrasena()
    {
        var usuario = Crear();

        usuario.InvalidarSesiones();

        Assert.Equal(2, usuario.VersionDeCredenciales);
        Assert.Equal("hash-original", usuario.HashDeContrasena);
        Assert.Null(usuario.FechaDeCambioDeContrasena);
    }

    [Fact]
    public void InvalidarSesiones_LlamadaDosVeces_SubeDosVeces()
    {
        var usuario = Crear();

        usuario.InvalidarSesiones();
        usuario.InvalidarSesiones();

        Assert.Equal(3, usuario.VersionDeCredenciales);
    }

    [Fact]
    public void CambiarContrasena_SustituyeElHashYAnotaCuando()
    {
        var usuario = Crear();
        var cambio = Alta.AddDays(30);

        usuario.CambiarContrasena("hash-nuevo", cambio);

        Assert.Equal("hash-nuevo", usuario.HashDeContrasena);
        Assert.Equal(cambio, usuario.FechaDeCambioDeContrasena);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void CambiarContrasena_RechazaUnHashVacio(string hash)
    {
        var usuario = Crear();

        Assert.Throws<ArgumentException>(() => usuario.CambiarContrasena(hash, Alta));

        // Y el usuario se queda como estaba: un hash en blanco dejaría la cuenta
        // sin contraseña utilizable.
        Assert.Equal("hash-original", usuario.HashDeContrasena);
        Assert.Equal(1, usuario.VersionDeCredenciales);
    }

    [Fact]
    public void CambiarContrasena_NoTocaElCorreoNiElNombreNiLaFechaDeAlta()
    {
        var usuario = Crear();

        usuario.CambiarContrasena("hash-nuevo", Alta.AddDays(1));

        Assert.Equal("alguien@ejemplo.com", usuario.Correo.Valor);
        Assert.Equal("Ana Pérez", usuario.Nombre.Valor);
        Assert.Equal(Alta, usuario.FechaDeAlta);
    }
}
