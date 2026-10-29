using Decorazon.Dominio.Puertos;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

/// <summary>
/// Borra en SQL, sin traer nada a memoria, lo terminado antes del límite.
/// </summary>
/// <remarks>
/// "Terminada" es lo primero que ocurrió de usarse o caducar: por eso basta con
/// que <b>cualquiera</b> de las dos fechas sea anterior al límite. Una consumida
/// conserva su caducidad original (posterior al consumo); una anulada tiene la
/// caducidad adelantada al momento de anularla. Lo vigente tiene la caducidad en
/// el futuro y ningún consumo, así que no entra.
/// </remarks>
public sealed class LimpiezaDeCaducadosEf(DecorazonDbContext contexto) : ILimpiezaDeCaducados
{
    public async Task<ResultadoDeLimpieza> BorrarTerminadasAntesDeAsync(
        DateTimeOffset limite,
        CancellationToken cancelacion = default)
    {
        await using var transaccion = await contexto.Database.BeginTransactionAsync(cancelacion);

        var altas = await contexto.SolicitudesDeRegistro
            .Where(solicitud => solicitud.FechaDeCaducidad < limite || solicitud.FechaDeConsumo < limite)
            .ExecuteDeleteAsync(cancelacion);

        var contrasenas = await contexto.SolicitudesDeContrasena
            .Where(solicitud => solicitud.FechaDeCaducidad < limite || solicitud.FechaDeConsumo < limite)
            .ExecuteDeleteAsync(cancelacion);

        await transaccion.CommitAsync(cancelacion);

        return new ResultadoDeLimpieza(altas, contrasenas);
    }

    public Task<int> DescartarDisenosCaducadosAsync(DateTimeOffset ahora, CancellationToken cancelacion = default) =>
        // SQL directo: vaciar un tipo complejo opcional con ExecuteUpdate no tiene
        // forma limpia de expresarse. Solo toca las que aún guardan diseño.
        contexto.Database.ExecuteSqlInterpolatedAsync(
            $"""
             UPDATE solicitudes_de_registro
             SET diseno_nombre = NULL, diseno_tipo = NULL, diseno_contenido = NULL
             WHERE fecha_de_caducidad <= {ahora}
               AND (diseno_nombre IS NOT NULL OR diseno_tipo IS NOT NULL OR diseno_contenido IS NOT NULL)
             """,
            cancelacion);
}
