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

    /// <summary>
    /// Renuncia explícita a enviar correo fuera de desarrollo (p. ej. un entorno de
    /// pruebas desplegado). Sin ella, la API no arranca allí con <see cref="UsarBrevo"/> a
    /// <c>false</c>: los enlaces irían al log y nadie podría darse de alta.
    /// </summary>
    public bool Simulado { get; set; }

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

    /// <summary>
    /// Opcional. Con <see cref="UsarBrevo"/> a <c>false</c> y un valor aquí, cada correo se escribe también
    /// como fichero de texto en esta carpeta (para las pruebas E2E). Fuera de desarrollo se rechaza.
    /// </summary>
    public string CarpetaDeSimulados { get; set; } = string.Empty;

    /// <summary>
    /// Comprobaciones que solo valen fuera de Development y de los tests: allí el correo
    /// simulado y la web en http://localhost son lo normal; en un despliegue, un error.
    /// </summary>
    public void ValidarFueraDeDesarrollo()
    {
        if (!UsarBrevo && !Simulado)
        {
            throw new InvalidOperationException(
                $"'{Seccion}:UsarBrevo' debe ser true fuera de desarrollo: si no, los enlaces de alta y de " +
                $"contraseña solo irían al log. Para no enviar correo a propósito, pon '{Seccion}:Simulado' a true.");
        }

        if (!string.IsNullOrWhiteSpace(CarpetaDeSimulados))
        {
            throw new InvalidOperationException(
                $"'{Seccion}:CarpetaDeSimulados' solo vale en desarrollo y pruebas: dejaría en disco los enlaces " +
                "con token de cada correo. Quítala.");
        }

        if (!Uri.TryCreate(BaseDeLaWeb, UriKind.Absolute, out var web) || web.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException(
                $"'{Seccion}:BaseDeLaWeb' debe ser una URL absoluta https (p. ej. https://decorazon.angelgf.com.es): " +
                $"es la base de los enlaces que llegan por correo. Valor actual: '{BaseDeLaWeb}'.");
        }
    }

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
