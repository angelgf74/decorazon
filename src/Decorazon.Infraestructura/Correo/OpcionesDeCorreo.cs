namespace Decorazon.Infraestructura.Correo;

/// <summary>Configuración del envío de correo transaccional.</summary>
public sealed class OpcionesDeCorreo
{
    public const string Seccion = "Correo";

    /// <summary>
    /// Si es <c>false</c> (valor por defecto), se usa el enviador de consola.
    /// Brevo se activa solo con configuración explícita, para que nadie mande
    /// correo real desde una máquina de desarrollo sin querer.
    /// </summary>
    public bool UsarBrevo { get; set; }

    /// <summary>Clave de API de Brevo. Secreto: nunca en el repositorio.</summary>
    public string ClaveDeApi { get; set; } = string.Empty;

    /// <summary>Dirección remitente. Debe pertenecer al dominio autenticado con SPF y DKIM.</summary>
    public string CorreoRemitente { get; set; } = string.Empty;

    public string NombreRemitente { get; set; } = "Decorazon";

    /// <summary>
    /// Dirección a la que responder. Si no se indica, se usa la del remitente.
    /// Conviene que sea un buzón que alguien lea: un dominio que solo envía y
    /// nunca recibe respuestas puntúa peor en reputación.
    /// </summary>
    public string CorreoDeRespuesta
    {
        get => string.IsNullOrWhiteSpace(_correoDeRespuesta) ? CorreoRemitente : _correoDeRespuesta;
        set => _correoDeRespuesta = value;
    }

    private string _correoDeRespuesta = string.Empty;

    /// <summary>Base pública de la web, para construir el enlace del correo.</summary>
    public string BaseDeLaWeb { get; set; } = "http://localhost:5321";

    public void Validar()
    {
        if (!UsarBrevo)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(ClaveDeApi))
        {
            throw new InvalidOperationException(
                $"'{Seccion}:UsarBrevo' está activo pero falta '{Seccion}:ClaveDeApi'.");
        }

        if (string.IsNullOrWhiteSpace(CorreoRemitente))
        {
            throw new InvalidOperationException(
                $"'{Seccion}:UsarBrevo' está activo pero falta '{Seccion}:CorreoRemitente'.");
        }
    }
}
