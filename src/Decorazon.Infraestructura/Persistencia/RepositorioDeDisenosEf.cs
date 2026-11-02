using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Puertos;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

public sealed class RepositorioDeDisenosEf(DecorazonDbContext contexto) : IRepositorioDeDisenos
{
    /// <summary>Nombre de la clave primaria de <c>disenos</c> en la migración inicial.</summary>
    private const string ClavePrimaria = "pk_disenos";

    private const string ClavePrimariaDeVistas = "pk_vistas_previas";

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
                diseno.Version,
                diseno.EnlaceCompartido))
            .ToListAsync(cancelacion);

    public Task<int> ContarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        contexto.Disenos.CountAsync(diseno => diseno.UsuarioId == usuarioId, cancelacion);

    public Task<Diseno?> ObtenerCompartidoAsync(string enlace, CancellationToken cancelacion = default) =>
        contexto.Disenos.AsNoTracking().FirstOrDefaultAsync(diseno => diseno.EnlaceCompartido == enlace, cancelacion);

    // ExecuteUpdate: un UPDATE directo, fuera del seguimiento y sin comparar la versión. La condición
    // "enlace_compartido IS NULL" hace que de dos peticiones simultáneas solo la primera escriba.
    public async Task<string?> CompartirAsync(Guid usuarioId, Guid id, string enlace, CancellationToken cancelacion = default)
    {
        await contexto.Disenos
            .Where(diseno => diseno.UsuarioId == usuarioId && diseno.Id == id && diseno.EnlaceCompartido == null)
            .ExecuteUpdateAsync(cambios => cambios.SetProperty(diseno => diseno.EnlaceCompartido, enlace), cancelacion);

        return await contexto.Disenos
            .Where(diseno => diseno.UsuarioId == usuarioId && diseno.Id == id)
            .Select(diseno => diseno.EnlaceCompartido)
            .FirstOrDefaultAsync(cancelacion);
    }

    public async Task<bool> DejarDeCompartirAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        await contexto.Disenos
            .Where(diseno => diseno.UsuarioId == usuarioId && diseno.Id == id)
            .ExecuteUpdateAsync(cambios => cambios.SetProperty(diseno => diseno.EnlaceCompartido, (string?)null), cancelacion) > 0;

    public async Task<bool> GuardarVistaPreviaAsync(Guid usuarioId, Guid id, byte[] imagen, DateTimeOffset fecha, CancellationToken cancelacion = default)
    {
        if (!await contexto.Disenos.AnyAsync(diseno => diseno.UsuarioId == usuarioId && diseno.Id == id, cancelacion))
        {
            return false;
        }

        var existente = await contexto.VistasPrevias.FindAsync([id], cancelacion);
        if (existente is null) contexto.VistasPrevias.Add(VistaPrevia.Crear(id, imagen, fecha));
        else existente.Sustituir(imagen, fecha);

        try
        {
            await contexto.SaveChangesAsync(cancelacion);
            return true;
        }
        catch (DbUpdateException excepcion) when (ErroresDePostgres.EsUnicidadViolada(excepcion, ClavePrimariaDeVistas))
        {
            // Otra subida del mismo diseño se adelantó: su imagen vale igual (las dos son de este momento).
            contexto.ChangeTracker.Clear();
            return true;
        }
        catch (DbUpdateException excepcion) when (ErroresDePostgres.EsClaveForaneaViolada(excepcion))
        {
            // El diseño se borró entre comprobarlo y guardar.
            contexto.ChangeTracker.Clear();
            return false;
        }
    }

    public Task<VistaPrevia?> ObtenerVistaPreviaAsync(string enlace, CancellationToken cancelacion = default) =>
        contexto.VistasPrevias
            .AsNoTracking()
            .Where(vista => contexto.Disenos.Any(diseno => diseno.Id == vista.DisenoId && diseno.EnlaceCompartido == enlace))
            .FirstOrDefaultAsync(cancelacion);

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
