using System.Text.Json;

namespace Decorazon.Contratos.Disenos;

/// <summary>
/// Cuerpo de <c>POST /disenos</c> y <c>PUT /disenos/{id}</c>, y diseño adjunto
/// al registro.
/// </summary>
/// <remarks>
/// <see cref="Contenido"/> viaja como objeto JSON, no como cadena: así el
/// cliente no tiene que serializar dos veces ni el documento llega escapado.
/// La API no interpreta la geometría; solo comprueba el envoltorio y el tamaño.
/// Ausente o <c>null</c> se rechaza igual que un contenido mal formado.
/// </remarks>
public sealed class PeticionDeDiseno
{
    /// <summary>
    /// Solo en <c>POST /disenos</c>, opcional: el id que el cliente ya le dio al diseño.
    /// Repetir el alta con el mismo id devuelve el diseño ya creado (200) en vez de otro.
    /// </summary>
    public Guid? Id { get; set; }

    public string? Nombre { get; set; }

    /// <summary><c>dormitorio</c>, <c>salon</c> o <c>cocina</c>.</summary>
    public string? TipoEstancia { get; set; }

    public JsonElement? Contenido { get; set; }
}

/// <summary>Un diseño en el listado de <c>GET /disenos</c>, sin el contenido.</summary>
public sealed record RespuestaDeResumenDeDiseno(
    Guid Id,
    string Nombre,
    string TipoEstancia,
    DateTimeOffset FechaDeCreacion,
    DateTimeOffset FechaDeModificacion,
    int Version);

/// <summary>Un diseño completo. Su <see cref="Version"/> es la misma que la cabecera <c>ETag</c>.</summary>
public sealed record RespuestaDeDiseno(
    Guid Id,
    string Nombre,
    string TipoEstancia,
    DateTimeOffset FechaDeCreacion,
    DateTimeOffset FechaDeModificacion,
    int Version,
    JsonElement Contenido);

/// <summary>
/// 412 de <c>PUT /disenos/{id}</c>: el diseño se ha guardado desde otro sitio
/// después de que este cliente lo leyera.
/// </summary>
/// <param name="Version">La versión actual, para que el cliente decida cómo reconciliar.</param>
public sealed record RespuestaDeVersionDistinta(string Mensaje, int Version);
