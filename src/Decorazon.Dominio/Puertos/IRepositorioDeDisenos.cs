using Decorazon.Dominio.Disenos;

namespace Decorazon.Dominio.Puertos;

/// <summary>
/// Puerto de salida de los diseños. Todo se consulta por usuario: un diseño
/// ajeno es indistinguible de uno que no existe.
/// </summary>
public interface IRepositorioDeDisenos
{
    /// <summary>Null si no existe o es de otro usuario.</summary>
    Task<Diseno?> ObtenerAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default);

    /// <summary>Del más recientemente modificado al más antiguo.</summary>
    Task<IReadOnlyList<Diseno>> ListarAsync(Guid usuarioId, CancellationToken cancelacion = default);

    Task<int> ContarAsync(Guid usuarioId, CancellationToken cancelacion = default);

    Task AnadirAsync(Diseno diseno, CancellationToken cancelacion = default);

    void Borrar(Diseno diseno);

    Task GuardarCambiosAsync(CancellationToken cancelacion = default);
}
