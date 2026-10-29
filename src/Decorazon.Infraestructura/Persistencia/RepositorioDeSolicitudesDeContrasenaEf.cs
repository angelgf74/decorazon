using Microsoft.EntityFrameworkCore;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Infraestructura.Persistencia;

public sealed class RepositorioDeSolicitudesDeContrasenaEf(DecorazonDbContext contexto)
    : IRepositorioDeSolicitudesDeContrasena
{
    public Task<SolicitudDeContrasena?> BuscarPorHashDelTokenAsync(
        string hashDelToken,
        CancellationToken cancelacion = default) =>
        contexto.SolicitudesDeContrasena
            .FirstOrDefaultAsync(solicitud => solicitud.HashDelToken == hashDelToken, cancelacion);

    public async Task<IReadOnlyCollection<SolicitudDeContrasena>> BuscarVivasPorUsuarioAsync(
        Guid usuarioId,
        CancellationToken cancelacion = default) =>
        await contexto.SolicitudesDeContrasena
            .Where(solicitud => solicitud.UsuarioId == usuarioId && solicitud.FechaDeConsumo == null)
            .ToListAsync(cancelacion);

    public Task<int> ContarCreadasDesdeAsync(
        Guid usuarioId,
        DateTimeOffset desde,
        CancellationToken cancelacion = default) =>
        contexto.SolicitudesDeContrasena
            .CountAsync(solicitud => solicitud.UsuarioId == usuarioId && solicitud.FechaDeCreacion >= desde, cancelacion);

    public async Task AnadirAsync(SolicitudDeContrasena solicitud, CancellationToken cancelacion = default)
    {
        await contexto.SolicitudesDeContrasena.AddAsync(solicitud, cancelacion);

        // Guarda también las invalidaciones de solicitudes anteriores que el caso
        // de uso haya hecho sobre entidades ya rastreadas por el contexto.
        await GuardadoDeSolicitudes.GuardarNuevaAsync(contexto, cancelacion);
    }

    public Task<bool> GuardarCambiosAsync(CancellationToken cancelacion = default) =>
        GuardadoDeSolicitudes.GuardarConsumoAsync(contexto, cancelacion);
}
