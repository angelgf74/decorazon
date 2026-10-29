using Decorazon.Dominio.Puertos;

namespace Decorazon.Aplicacion.Cuentas;

/// <summary>
/// Los datos de la propia cuenta. El nombre no viaja en el JWT (puede ser
/// largo, y meterlo obligaría a reemitir el token si algún día se cambia), así
/// que se lee de la base de datos.
/// </summary>
public sealed class ConsultarMiCuenta(IRepositorioDeUsuarios usuarios)
{
    /// <returns><c>null</c> si la cuenta ya no existe.</returns>
    public async Task<DatosDeMiCuenta?> EjecutarAsync(Guid usuarioId, CancellationToken cancelacion = default)
    {
        var usuario = await usuarios.BuscarPorIdAsync(usuarioId, cancelacion);

        if (usuario is null)
        {
            return null;
        }

        return new DatosDeMiCuenta(usuario.Id, usuario.Correo.Valor, usuario.Nombre.Valor);
    }
}

public sealed record DatosDeMiCuenta(Guid Id, string Correo, string Nombre);
