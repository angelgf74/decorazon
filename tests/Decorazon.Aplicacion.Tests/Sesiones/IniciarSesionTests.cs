using Decorazon.Aplicacion.Sesiones;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Tests.Sesiones;

public class IniciarSesionTests
{
    private const string ContrasenaValida = "una-contrasena-larga";

    private readonly RepositorioDeUsuariosEnMemoria _usuarios = new();
    private readonly HasheadorFalso _hasheador = new();
    private readonly EmisorDeAccesoFalso _emisor = new();

    private IniciarSesion CasoDeUso => new(_usuarios, _hasheador, _emisor);

    [Fact]
    public async Task CredencialesCorrectas_DevuelvenAcceso()
    {
        await DarDeAlta("alguien@ejemplo.com");

        var acceso = await CasoDeUso.EjecutarAsync("alguien@ejemplo.com", ContrasenaValida);

        Assert.NotNull(acceso);
        Assert.Equal("acceso-de-alguien@ejemplo.com", acceso.Token);
    }

    [Fact]
    public async Task CorreoConMayusculas_TambienInicia()
    {
        await DarDeAlta("alguien@ejemplo.com");

        var acceso = await CasoDeUso.EjecutarAsync("ALGUIEN@Ejemplo.com", ContrasenaValida);

        Assert.NotNull(acceso);
    }

    [Fact]
    public async Task ContrasenaIncorrecta_NoDevuelveAcceso()
    {
        await DarDeAlta("alguien@ejemplo.com");

        var acceso = await CasoDeUso.EjecutarAsync("alguien@ejemplo.com", "otra-contrasena-larga");

        Assert.Null(acceso);
    }

    [Fact]
    public async Task CorreoInexistente_NoDevuelveAcceso()
    {
        var acceso = await CasoDeUso.EjecutarAsync("nadie@ejemplo.com", ContrasenaValida);

        Assert.Null(acceso);
    }

    [Fact]
    public async Task CorreoConFormatoInvalido_NoRevienta()
    {
        var acceso = await CasoDeUso.EjecutarAsync("no-es-un-correo", ContrasenaValida);

        Assert.Null(acceso);
    }

    private async Task DarDeAlta(string correo)
    {
        var usuario = Usuario.Crear(
            CorreoElectronico.Crear(correo),
            NombreDeUsuario.Crear("Ana"),
            _hasheador.Hashear(CrearContrasena(ContrasenaValida)),
            DateTimeOffset.UtcNow);

        await _usuarios.AnadirAsync(usuario);
    }

    private static Contrasena CrearContrasena(string valor)
    {
        Assert.True(Contrasena.TryCrear(valor, out var contrasena));
        return contrasena;
    }
}
