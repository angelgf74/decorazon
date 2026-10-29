using Decorazon.Dominio.Puertos;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

/// <summary>
/// Adaptador del puerto <see cref="IComprobadorDeAlmacen"/> contra PostgreSQL.
/// </summary>
public sealed class ComprobadorDeAlmacenEf(DecorazonDbContext contexto) : IComprobadorDeAlmacen
{
    public async Task<bool> RespondeAsync(CancellationToken cancelacion = default)
    {
        try
        {
            return await contexto.Database.CanConnectAsync(cancelacion);
        }
        catch (Exception)
        {
            // Que la base de datos no responda es un estado esperado: es justo lo
            // que este puerto existe para detectar. El endpoint lo traduce a 503.
            return false;
        }
    }
}
