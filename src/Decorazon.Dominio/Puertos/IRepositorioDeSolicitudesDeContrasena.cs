using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Puertos;

public interface IRepositorioDeSolicitudesDeContrasena
{
    Task<SolicitudDeContrasena?> BuscarPorHashDelTokenAsync(
        string hashDelToken,
        CancellationToken cancelacion = default);

    /// <summary>Solicitudes de ese usuario que aún no se han consumido, para invalidarlas.</summary>
    Task<IReadOnlyCollection<SolicitudDeContrasena>> BuscarVivasPorUsuarioAsync(
        Guid usuarioId,
        CancellationToken cancelacion = default);

    Task AnadirAsync(SolicitudDeContrasena solicitud, CancellationToken cancelacion = default);

    /// <summary>
    /// Persiste los cambios sobre solicitudes ya existentes (consumirlas o invalidarlas).
    /// Explícito por el mismo motivo que en el registro: si dependiera de que otro
    /// repositorio guarde por él, reordenar dos líneas dejaría un token consumido sin
    /// registrar, reutilizable para volver a cambiar la contraseña.
    /// </summary>
    Task GuardarCambiosAsync(CancellationToken cancelacion = default);
}
