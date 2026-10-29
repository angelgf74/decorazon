namespace Decorazon.Dominio.Puertos;

/// <summary>
/// El proveedor de correo no ha podido aceptar el mensaje (caído, cuota agotada,
/// clave rechazada). Es parte del contrato de <see cref="IEnviadorDeCorreo"/>: los
/// adaptadores traducen a esta excepción sus fallos de entrega, para que los casos de
/// uso puedan responder "inténtalo dentro de un rato" sin conocer al proveedor.
/// </summary>
public sealed class CorreoNoEnviadoException(string mensaje, Exception? causa = null)
    : Exception(mensaje, causa);
