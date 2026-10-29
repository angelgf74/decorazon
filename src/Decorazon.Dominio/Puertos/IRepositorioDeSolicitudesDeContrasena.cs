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

    /// <summary>
    /// Solicitudes creadas para ese usuario desde <paramref name="desde"/>, vigentes o no:
    /// cuenta los intentos para limitar cuántos enlaces se le mandan por hora.
    /// </summary>
    Task<int> ContarCreadasDesdeAsync(
        Guid usuarioId,
        DateTimeOffset desde,
        CancellationToken cancelacion = default);

    Task AnadirAsync(SolicitudDeContrasena solicitud, CancellationToken cancelacion = default);

    /// <summary>
    /// Persiste los cambios sobre solicitudes ya existentes (consumirlas o invalidarlas).
    /// Explícito por el mismo motivo que en el registro: si dependiera de que otro
    /// repositorio guarde por él, reordenar dos líneas dejaría un token consumido sin
    /// registrar, reutilizable para volver a cambiar la contraseña.
    /// </summary>
    /// <returns><c>false</c> si otro consumió o invalidó la solicitud entretanto: no se guardó nada.</returns>
    Task<bool> GuardarCambiosAsync(CancellationToken cancelacion = default);
}
