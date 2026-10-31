using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Puertos;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

public sealed class RepositorioDeDisenosEf(DecorazonDbContext contexto) : IRepositorioDeDisenos
{
    /// <summary>Nombre de la clave primaria de <c>disenos</c> en la migración inicial.</summary>
    private const string ClavePrimaria = "pk_disenos";

    // Usuario e id en la misma consulta: un diseño ajeno nunca llega a cargarse,
    // así no hay camino por el que un fallo posterior lo devuelva por error.
    public Task<Diseno?> ObtenerAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        contexto.Disenos.FirstOrDefaultAsync(
            diseno => diseno.UsuarioId == usuarioId && diseno.Id == id,
            cancelacion);

    // Proyección: el SELECT no incluye la columna jsonb del contenido.
    public async Task<IReadOnlyList<ResumenDeDiseno>> ListarResumenesAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        await contexto.Disenos
            .AsNoTracking()
            .Where(diseno => diseno.UsuarioId == usuarioId)
            .OrderByDescending(diseno => diseno.FechaDeModificacion)
            .Select(diseno => new ResumenDeDiseno(
                diseno.Id,
                diseno.Nombre,
                diseno.Tipo,
                diseno.FechaDeCreacion,
                diseno.FechaDeModificacion,
                diseno.Version))
            .ToListAsync(cancelacion);

    public Task<int> ContarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        contexto.Disenos.CountAsync(diseno => diseno.UsuarioId == usuarioId, cancelacion);

    // Solo rastrea: lo guarda GuardarCambiosAsync o el guardado de otro repositorio
    // que comparta el contexto (así el alta con diseño es una sola transacción).
    public void Anadir(Diseno diseno) => contexto.Disenos.Add(diseno);

    public void Borrar(Diseno diseno) => contexto.Disenos.Remove(diseno);

    public async Task<bool> GuardarCambiosAsync(CancellationToken cancelacion = default)
    {
        try
        {
            await contexto.SaveChangesAsync(cancelacion);
            return true;
        }
        catch (DbUpdateException excepcion) when (ErroresDePostgres.EsUnicidadViolada(excepcion, ClavePrimaria))
        {
            // Un alta con el id del cliente chocó con un diseño ya guardado. Se olvida lo
            // rastreado para que el caso de uso relea el que hay de verdad.
            contexto.ChangeTracker.Clear();
            throw new IdentificadorRepetidoException(excepcion);
        }
        catch (Exception excepcion) when (
            excepcion is DbUpdateConcurrencyException
            || (excepcion is DbUpdateException actualizacion && ErroresDePostgres.EsClaveForaneaViolada(actualizacion)))
        {
            // Concurrencia: el UPDATE o DELETE no encontró la versión leída (otro guardó o
            // borró entretanto). Clave foránea: la cuenta se borró entre contar y guardar.
            // Se olvida lo rastreado para que la relectura del caso de uso traiga lo que hay
            // de verdad y no la copia en memoria que no se pudo guardar. El contexto es de la
            // petición y en ella no hay nada más pendiente.
            contexto.ChangeTracker.Clear();
            return false;
        }
    }
}
