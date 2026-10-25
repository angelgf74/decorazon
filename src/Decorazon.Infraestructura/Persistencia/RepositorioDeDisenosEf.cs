using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Puertos;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

public sealed class RepositorioDeDisenosEf(DecorazonDbContext contexto) : IRepositorioDeDisenos
{
    // Usuario e id en la misma consulta: un diseño ajeno nunca llega a cargarse,
    // así no hay camino por el que un fallo posterior lo devuelva por error.
    public Task<Diseno?> ObtenerAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        contexto.Disenos.FirstOrDefaultAsync(
            diseno => diseno.UsuarioId == usuarioId && diseno.Id == id,
            cancelacion);

    public async Task<IReadOnlyList<Diseno>> ListarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        await contexto.Disenos
            .Where(diseno => diseno.UsuarioId == usuarioId)
            .OrderByDescending(diseno => diseno.FechaDeModificacion)
            .ToListAsync(cancelacion);

    public Task<int> ContarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        contexto.Disenos.CountAsync(diseno => diseno.UsuarioId == usuarioId, cancelacion);

    // Solo rastrea: lo guarda GuardarCambiosAsync o el guardado de otro repositorio
    // que comparta el contexto (así el alta con diseño es una sola transacción).
    public void Anadir(Diseno diseno) => contexto.Disenos.Add(diseno);

    public void Borrar(Diseno diseno) => contexto.Disenos.Remove(diseno);

    public Task GuardarCambiosAsync(CancellationToken cancelacion = default) =>
        contexto.SaveChangesAsync(cancelacion);
}
