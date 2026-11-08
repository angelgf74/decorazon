namespace Decorazon.Contratos.Administracion;

/// <summary>
/// Una fila de <c>GET /administracion/usuarios</c>: una cuenta, cuántos diseños
/// guarda y cuánto ocupan en el servidor.
/// </summary>
/// <param name="Bytes">
/// Lo que ocupan en la base de datos sus diseños, sus vistas previas y sus
/// versiones anteriores. Es el tamaño almacenado (comprimido si PostgreSQL lo
/// comprime), no el del JSON que viaja por la red.
/// </param>
public sealed record RespuestaDeUsoDeUsuario(
    Guid Id,
    string Correo,
    string Nombre,
    DateTimeOffset FechaDeAlta,
    int Disenos,
    long Bytes);

/// <summary>Respuesta de <c>GET /administracion/usuarios</c>: de más a menos espacio, con los totales.</summary>
public sealed record RespuestaDeListadoDeUsuarios(
    IReadOnlyList<RespuestaDeUsoDeUsuario> Usuarios,
    int TotalDeDisenos,
    long TotalDeBytes);
