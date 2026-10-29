using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

/// <summary>
/// Guardados de las solicitudes (alta y contraseña), que comparten mecánica: la fecha
/// de consumo es token de concurrencia, así que un conflicto significa siempre que
/// otro consumió, invalidó o borró la solicitud entretanto.
/// </summary>
internal static class GuardadoDeSolicitudes
{
    /// <summary>
    /// Para el consumo de un enlace: <c>false</c> si otro lo usó antes. Se olvida lo
    /// rastreado, porque esa copia en memoria ya no dice la verdad.
    /// </summary>
    public static async Task<bool> GuardarConsumoAsync(DbContext contexto, CancellationToken cancelacion)
    {
        try
        {
            await contexto.SaveChangesAsync(cancelacion);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            contexto.ChangeTracker.Clear();
            return false;
        }
    }

    /// <summary>
    /// Para una solicitud nueva junto con la invalidación de las anteriores. Si una
    /// anterior ya no estaba viva (otro la consumió o se borró), invalidarla sobra: se
    /// deja de rastrear y se reintenta, para que la nueva se guarde igual.
    /// </summary>
    public static async Task GuardarNuevaAsync(DbContext contexto, CancellationToken cancelacion)
    {
        while (true)
        {
            try
            {
                await contexto.SaveChangesAsync(cancelacion);
                return;
            }
            catch (DbUpdateConcurrencyException conflicto) when (conflicto.Entries.Count > 0)
            {
                // Solo un UPDATE o un DELETE choca; la solicitud nueva es un INSERT y no
                // está aquí. Cada vuelta suelta al menos una entrada, así que termina.
                foreach (var entrada in conflicto.Entries)
                {
                    entrada.State = EntityState.Detached;
                }
            }
        }
    }
}
