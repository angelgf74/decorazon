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

    /// <summary>
    /// Los diseños del usuario sin su contenido, del más recientemente modificado
    /// al más antiguo. Solo lectura: no se rastrean.
    /// </summary>
    Task<IReadOnlyList<ResumenDeDiseno>> ListarResumenesAsync(Guid usuarioId, CancellationToken cancelacion = default);

    Task<int> ContarAsync(Guid usuarioId, CancellationToken cancelacion = default);

    /// <summary>
    /// Solo rastrea el diseño: no lo persiste. <see cref="GuardarCambiosAsync"/> lo guarda
    /// (o el guardado de otro repositorio que comparta la misma unidad de trabajo).
    /// </summary>
    void Anadir(Diseno diseno);

    void Borrar(Diseno diseno);

    /// <summary>
    /// Persiste lo rastreado. Un fallo de concurrencia es un resultado, no una excepción.
    /// </summary>
    /// <returns>
    /// <c>false</c> si no se guardó nada porque otro cambió o borró ese diseño entretanto
    /// (su versión ya no es la leída), o porque la cuenta dueña ya no existe. Tras un
    /// <c>false</c> se olvida lo rastreado: una nueva lectura trae lo que hay en el almacén.
    /// </returns>
    Task<bool> GuardarCambiosAsync(CancellationToken cancelacion = default);
}
