using Decorazon.Dominio.Disenos;

namespace Decorazon.Dominio.Registro;

/// <summary>
/// Diseño que la persona hizo sin cuenta y que se guardará al completar el alta.
/// Viaja con la solicitud de registro: si la solicitud se invalida, se descarta.
/// </summary>
public sealed record DisenoPendiente(NombreDeDiseno Nombre, TipoDeEstancia Tipo, ContenidoDeDiseno Contenido);
