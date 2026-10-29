namespace Decorazon.Dominio.Puertos;

/// <summary>
/// Puerto de salida que responde si el almacén de datos está accesible.
/// El dominio no sabe qué hay detrás: podría ser PostgreSQL, un fichero o memoria.
/// </summary>
public interface IComprobadorDeAlmacen
{
    Task<bool> RespondeAsync(CancellationToken cancelacion = default);
}
