using Decorazon.Aplicacion.Cuentas;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Tests.Cuentas;

public class ConsultarMiCuentaTests
{
    private readonly RepositorioDeUsuariosEnMemoria _usuarios = new();

    private ConsultarMiCuenta CasoDeUso => new(_usuarios);

    [Fact]
    public async Task DevuelveIdCorreoYNombre()
    {
        var usuario = Usuario.Crear(
            CorreoElectronico.Crear("ana@ejemplo.com"),
            NombreDeUsuario.Crear("Ana Pérez"),
            "hash",
            DateTimeOffset.UtcNow);
        await _usuarios.AnadirAsync(usuario);

        var datos = await CasoDeUso.EjecutarAsync(usuario.Id);

        Assert.Equal(new DatosDeMiCuenta(usuario.Id, "ana@ejemplo.com", "Ana Pérez"), datos);
    }

    [Fact]
    public async Task UsuarioInexistente_DevuelveNull()
    {
        Assert.Null(await CasoDeUso.EjecutarAsync(Guid.NewGuid()));
    }
}
