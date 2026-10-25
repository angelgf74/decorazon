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

    /// <summary>
    /// Solo rastrea el diseño: no lo persiste. <see cref="GuardarCambiosAsync"/> lo guarda
    /// (o el guardado de otro repositorio que comparta la misma unidad de trabajo).
    /// </summary>
    void Anadir(Diseno diseno);

    void Borrar(Diseno diseno);

    Task GuardarCambiosAsync(CancellationToken cancelacion = default);
}
