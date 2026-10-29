using Microsoft.EntityFrameworkCore;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Infraestructura.Persistencia;

public sealed class RepositorioDeSolicitudesDeRegistroEf(DecorazonDbContext contexto)
    : IRepositorioDeSolicitudesDeRegistro
{
    public Task<SolicitudDeRegistro?> BuscarPorHashDelTokenAsync(
        string hashDelToken,
        CancellationToken cancelacion = default) =>
        contexto.SolicitudesDeRegistro
            .FirstOrDefaultAsync(solicitud => solicitud.HashDelToken == hashDelToken, cancelacion);

    public async Task<IReadOnlyCollection<SolicitudDeRegistro>> BuscarVivasPorCorreoAsync(
        CorreoElectronico correo,
        CancellationToken cancelacion = default) =>
        await contexto.SolicitudesDeRegistro
            .Where(solicitud => solicitud.Correo == correo && solicitud.FechaDeConsumo == null)
            .ToListAsync(cancelacion);

    public Task<int> ContarCreadasDesdeAsync(
        CorreoElectronico correo,
        DateTimeOffset desde,
        CancellationToken cancelacion = default) =>
        contexto.SolicitudesDeRegistro
            .CountAsync(solicitud => solicitud.Correo == correo && solicitud.FechaDeCreacion >= desde, cancelacion);

    public async Task AnadirAsync(SolicitudDeRegistro solicitud, CancellationToken cancelacion = default)
    {
        await contexto.SolicitudesDeRegistro.AddAsync(solicitud, cancelacion);

        // Guarda también las invalidaciones de solicitudes anteriores que el caso
        // de uso haya hecho sobre entidades ya rastreadas por el contexto.
        await GuardadoDeSolicitudes.GuardarNuevaAsync(contexto, cancelacion);
    }

    public Task<bool> GuardarCambiosAsync(CancellationToken cancelacion = default) =>
        GuardadoDeSolicitudes.GuardarConsumoAsync(contexto, cancelacion);
}
