namespace Decorazon.Contratos;

/// <summary>
/// Mensaje uniforme de la API, de error o de confirmación. Un solo texto
/// legible, sin detalles que ayuden a sondear.
/// </summary>
/// <param name="Mensaje">Texto para mostrar al usuario.</param>
public sealed record RespuestaDeError(string Mensaje);
