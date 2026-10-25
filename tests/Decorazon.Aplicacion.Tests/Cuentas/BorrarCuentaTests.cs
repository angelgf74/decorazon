using Decorazon.Aplicacion.Cuentas;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Usuarios;
using Microsoft.Extensions.Logging.Abstractions;

namespace Decorazon.Aplicacion.Tests.Cuentas;

/// <summary>Darse de baja.</summary>
public class BorrarCuentaTests
{
    private const string Contrasena = "una contraseña larga";

    private readonly RepositorioDeUsuariosEnMemoria _usuarios = new();
    private readonly BorradoEspia _borrado = new();
    private readonly HasheadorFalso _hasheador = new();
    private readonly EnviadorDeCorreoEspia _correo = new();
    private readonly Usuario _pepa;

    public BorrarCuentaTests()
    {
        _pepa = Usuario.Crear(
            CorreoElectronico.Crear("pepa@ejemplo.com"), NombreDeUsuario.Crear("Pepa Gómez"),
            $"hash({Contrasena})", new DateTimeOffset(2026, 10, 11, 9, 0, 0, TimeSpan.Zero));
        _usuarios.AnadirAsync(_pepa).GetAwaiter().GetResult();
    }

    private BorrarCuenta Baja =>
        new(_usuarios, _borrado, _hasheador, _correo, NullLogger<BorrarCuenta>.Instance);

    [Fact]
    public async Task ConLaContrasena_BorraLaCuentaYAvisa()
    {
        var resultado = await Baja.EjecutarAsync(_pepa.Id, Contrasena);

        Assert.Equal(ResultadoDeBaja.Correcto, resultado);
        // El doble recibe el id: el puerto borra también los diseños de ese usuario.
        Assert.Equal((_pepa.Id, "pepa@ejemplo.com"), Assert.Single(_borrado.Borradas));
        Assert.Equal("pepa@ejemplo.com", Assert.Single(_correo.ConfirmacionesDeBaja));
    }

    [Fact]
    public async Task ConContrasenaIncorrecta_NoBorraNiAvisa()
    {
        var resultado = await Baja.EjecutarAsync(_pepa.Id, "esta no es");

        Assert.Equal(ResultadoDeBaja.CredencialesIncorrectas, resultado);
        Assert.Empty(_borrado.Borradas);
        Assert.Empty(_correo.ConfirmacionesDeBaja);
    }

    [Fact]
    public async Task DeUnaCuentaQueNoExiste_EsComoUnaContrasenaIncorrecta()
    {
        Assert.Equal(ResultadoDeBaja.CredencialesIncorrectas, await Baja.EjecutarAsync(Guid.NewGuid(), Contrasena));
        Assert.Empty(_borrado.Borradas);
    }

    [Fact]
    public async Task SiElCorreoFalla_LaBajaSigueHecha()
    {
        _correo.FallaAlAvisarDeLaBaja = true;

        var resultado = await Baja.EjecutarAsync(_pepa.Id, Contrasena);

        Assert.Equal(ResultadoDeBaja.Correcto, resultado);
        Assert.Single(_borrado.Borradas);
    }
}
