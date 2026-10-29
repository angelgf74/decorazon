namespace Decorazon.Infraestructura.Seguridad;

/// <summary>Configuración de la emisión y validación de tokens de acceso.</summary>
public sealed class OpcionesDeJwt
{
    public const string Seccion = "Jwt";

    /// <summary>
    /// Longitud mínima de la clave de firma. HMAC-SHA256 pierde su garantía
    /// si la clave es más corta que su salida (256 bits).
    /// </summary>
    public const int LongitudMinimaDeClave = 32;

    /// <summary>Clave de firma. Secreto: por configuración, nunca en el repositorio.</summary>
    public string ClaveDeFirma { get; set; } = string.Empty;

    public string Emisor { get; set; } = "decorazon";

    public string Audiencia { get; set; } = "decorazon";

    /// <summary>
    /// Duración de la sesión. Amplia a propósito: sin tokens de refresco, una
    /// caducidad corta obligaría a escribir la contraseña a diario. La revocación
    /// "todos a la vez" existe (versión de credenciales); revocar un
    /// token suelto antes de que caduque sigue sin poder hacerse.
    /// </summary>
    public TimeSpan Duracion { get; set; } = TimeSpan.FromDays(7);

    /// <summary>
    /// Falla si la configuración no es utilizable. Se invoca al arrancar para que
    /// un despliegue mal configurado no llegue a atender peticiones.
    /// </summary>
    public void Validar()
    {
        if (string.IsNullOrWhiteSpace(ClaveDeFirma))
        {
            throw new InvalidOperationException(
                $"Falta '{Seccion}:ClaveDeFirma'. Defínela por configuración o variable de entorno.");
        }

        if (ClaveDeFirma.Length < LongitudMinimaDeClave)
        {
            throw new InvalidOperationException(
                $"'{Seccion}:ClaveDeFirma' debe tener al menos {LongitudMinimaDeClave} caracteres.");
        }
    }
}
