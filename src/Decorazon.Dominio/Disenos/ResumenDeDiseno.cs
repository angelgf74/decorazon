namespace Decorazon.Dominio.Disenos;

/// <summary>
/// Un diseño sin su contenido, para listarlos. El contenido puede pesar hasta
/// 1 MB por diseño y un usuario puede tener cien: el listado no lo necesita, así
/// que ni siquiera se lee de la base de datos.
/// </summary>
/// <param name="FechaDeVistaPrevia">Cuándo se subió su vista previa, o null si no tiene (la imagen no viaja en el listado).</param>
public sealed record ResumenDeDiseno(
    Guid Id,
    NombreDeDiseno Nombre,
    TipoDeEstancia Tipo,
    DateTimeOffset FechaDeCreacion,
    DateTimeOffset FechaDeModificacion,
    int Version,
    string? EnlaceCompartido,
    DateTimeOffset? FechaDeVistaPrevia = null);
