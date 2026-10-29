namespace Decorazon.Contratos.Salud;

/// <summary>
/// Respuesta pública de <c>GET /salud</c>.
/// </summary>
/// <param name="Estado">Estado global: <c>correcto</c> o <c>degradado</c>.</param>
/// <param name="BaseDeDatos">Si la base de datos responde.</param>
public sealed record RespuestaDeSalud(string Estado, bool BaseDeDatos);
