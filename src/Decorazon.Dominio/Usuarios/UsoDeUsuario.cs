namespace Decorazon.Dominio.Usuarios;

/// <summary>
/// Lo que una cuenta tiene guardado: para la vista de administración.
/// </summary>
/// <param name="Disenos">Cuántos diseños guarda.</param>
/// <param name="Bytes">
/// Lo que ocupan en el almacén sus diseños, con sus vistas previas y sus
/// versiones anteriores. Cómo se mide es cosa del adaptador.
/// </param>
public sealed record UsoDeUsuario(
    Guid Id,
    string Correo,
    string Nombre,
    DateTimeOffset FechaDeAlta,
    int Disenos,
    long Bytes);
