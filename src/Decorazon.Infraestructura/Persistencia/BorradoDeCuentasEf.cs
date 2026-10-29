using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

/// <summary>
/// Borra una cuenta entera en una transacción.
/// </summary>
/// <remarks>
/// El orden es explícito y no se apoya en las cascadas: de hijos a padres, y cada
/// paso filtra por el usuario o su correo, de forma que nada ajeno entra en ninguna
/// consulta. Una tabla nueva que cuelgue del usuario tendrá que entrar aquí.
/// </remarks>
public sealed class BorradoDeCuentasEf(DecorazonDbContext contexto) : IBorradoDeCuentas
{
    public async Task BorrarAsync(Guid usuarioId, CorreoElectronico correo, CancellationToken cancelacion = default)
    {
        await using var transaccion = await contexto.Database.BeginTransactionAsync(cancelacion);

        await contexto.Disenos
            .Where(diseno => diseno.UsuarioId == usuarioId)
            .ExecuteDeleteAsync(cancelacion);

        await contexto.SolicitudesDeContrasena
            .Where(solicitud => solicitud.UsuarioId == usuarioId)
            .ExecuteDeleteAsync(cancelacion);

        // Incluye el diseño pendiente que guardaran: no debe sobrevivir a la cuenta.
        await contexto.SolicitudesDeRegistro
            .Where(solicitud => solicitud.Correo == correo)
            .ExecuteDeleteAsync(cancelacion);

        await contexto.Usuarios.Where(usuario => usuario.Id == usuarioId).ExecuteDeleteAsync(cancelacion);

        await transaccion.CommitAsync(cancelacion);
    }
}
