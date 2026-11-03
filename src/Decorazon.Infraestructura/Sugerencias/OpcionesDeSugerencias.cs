namespace Decorazon.Infraestructura.Sugerencias;

/// <summary>Configuración del envío de sugerencias al buzón del autor.</summary>
public sealed class OpcionesDeSugerencias
{
    public const string Seccion = "Sugerencias";

    /// <summary>
    /// Si es <c>false</c> (valor por defecto), se usa el enviador de consola. En Development y
    /// en los tests <c>Program</c> lo fuerza a <c>false</c>: desde allí no sale nada al buzón real.
    /// </summary>
    public bool UsarServicioReal { get; set; }

    /// <summary>
    /// Renuncia explícita al buzón fuera de desarrollo (un entorno de pruebas desplegado). Sin
    /// ella, la API no arranca allí con <see cref="UsarServicioReal"/> a <c>false</c>: las
    /// sugerencias irían al log y nadie las leería.
    /// </summary>
    public bool Simulado { get; set; }

    /// <summary>El buzón de sugerencias, el mismo que usan las demás aplicaciones del autor.</summary>
    public string UrlBase { get; set; } = "https://gestorsugerencias-api.angelgf.com.es/";

    /// <summary>Cómo se identifica Decorazon ante el buzón, que recibe las de varias aplicaciones.</summary>
    public string Aplicacion { get; set; } = "Decorazon";

    /// <summary>
    /// <see cref="UrlBase"/> terminada en barra: sin ella, <c>api/Sugerencias</c> sustituiría su
    /// último tramo en vez de añadirse.
    /// </summary>
    public Uri DireccionBase() => new(UrlBase.EndsWith('/') ? UrlBase : UrlBase + "/");

    public void Validar()
    {
        if (!UsarServicioReal)
        {
            return;
        }

        if (!Uri.TryCreate(UrlBase, UriKind.Absolute, out var direccion)
            || (direccion.Scheme != Uri.UriSchemeHttps && direccion.Scheme != Uri.UriSchemeHttp))
        {
            throw new InvalidOperationException(
                $"'{Seccion}:UsarServicioReal' está activo pero '{Seccion}:UrlBase' no es una URL http(s) absoluta. " +
                $"Valor actual: '{UrlBase}'.");
        }

        if (string.IsNullOrWhiteSpace(Aplicacion))
        {
            throw new InvalidOperationException(
                $"'{Seccion}:UsarServicioReal' está activo pero falta '{Seccion}:Aplicacion'.");
        }
    }

    /// <summary>Comprobaciones que solo valen fuera de Development y de los tests.</summary>
    public void ValidarFueraDeDesarrollo()
    {
        if (!UsarServicioReal && !Simulado)
        {
            throw new InvalidOperationException(
                $"'{Seccion}:UsarServicioReal' debe ser true fuera de desarrollo: si no, las sugerencias solo irían " +
                $"al log. Para no enviarlas a propósito, pon '{Seccion}:Simulado' a true.");
        }

        if (UsarServicioReal
            && (!Uri.TryCreate(UrlBase, UriKind.Absolute, out var direccion) || direccion.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException(
                $"'{Seccion}:UrlBase' debe ser una URL absoluta https: lleva el correo de quien escribe. " +
                $"Valor actual: '{UrlBase}'.");
        }
    }
}
