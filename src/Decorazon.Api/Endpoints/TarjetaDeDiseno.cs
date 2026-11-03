using System.Text;

namespace Decorazon.Api.Endpoints;

/// <summary>
/// La tarjeta de un enlace compartido: un HTML mínimo con las etiquetas Open Graph y de Twitter que leen WhatsApp,
/// Telegram, Facebook, X o Slack para enseñar la vista previa. Las personas no llegan aquí (nginx solo manda a los
/// lectores de tarjetas); si alguien lo hace, tiene un enlace a la página. Sin redirección automática: un navegador
/// que nginx tomara por lector (el de una app que se identifique como tal) volvería aquí una y otra vez.
/// </summary>
public static class TarjetaDeDiseno
{
    /// <summary>El tamaño que piden las tarjetas grandes; el que tiene la imagen que sube la web.</summary>
    public const int AnchoImagen = 1200;
    public const int AltoImagen = 630;

    private const string DescripcionGenerica = "Diseña tu casa con medidas reales y comprueba que todo cabe y se abre.";

    private static readonly IReadOnlyDictionary<string, string> Estancias = new Dictionary<string, string>
    {
        ["dormitorio"] = "dormitorio",
        ["salon"] = "salón",
        ["cocina"] = "cocina",
        ["despacho"] = "despacho",
        ["bano"] = "baño",
    };

    /// <param name="imagen">La vista previa, con su tamaño; null para usar el icono de la web.</param>
    public static string DeDiseno(string nombre, string tipoEstancia, string direccionWeb, string? imagen, string icono) =>
        Html(
            nombre,
            $"Diseño de {Estancias.GetValueOrDefault(tipoEstancia, "estancia")} compartido con Decorazon: plano, vista 3D y lista de muebles.",
            direccionWeb,
            imagen ?? icono,
            imagenGrande: imagen is not null);

    /// <summary>Sin datos de nadie: para un enlace que no existe o ya no se comparte.</summary>
    public static string Generica(string direccionWeb, string icono) =>
        Html("Decorazon", DescripcionGenerica, direccionWeb, icono, imagenGrande: false);

    private static string Html(string titulo, string descripcion, string direccion, string imagen, bool imagenGrande)
    {
        var t = Escapar(titulo);
        var d = Escapar(descripcion);
        var u = Escapar(direccion);
        var i = Escapar(imagen);
        var html = new StringBuilder()
            .Append("<!doctype html>\n<html lang=\"es\">\n<head>\n<meta charset=\"utf-8\">\n")
            .Append($"<title>{t}</title>\n")
            .Append($"<meta name=\"description\" content=\"{d}\">\n")
            .Append("<meta property=\"og:type\" content=\"website\">\n")
            .Append("<meta property=\"og:site_name\" content=\"Decorazon\">\n")
            .Append("<meta property=\"og:locale\" content=\"es_ES\">\n")
            .Append($"<meta property=\"og:title\" content=\"{t}\">\n")
            .Append($"<meta property=\"og:description\" content=\"{d}\">\n")
            .Append($"<meta property=\"og:url\" content=\"{u}\">\n")
            .Append($"<meta property=\"og:image\" content=\"{i}\">\n");
        if (imagenGrande)
        {
            html.Append($"<meta property=\"og:image:width\" content=\"{AnchoImagen}\">\n")
                .Append($"<meta property=\"og:image:height\" content=\"{AltoImagen}\">\n");
        }
        return html
            .Append($"<meta name=\"twitter:card\" content=\"{(imagenGrande ? "summary_large_image" : "summary")}\">\n")
            .Append($"</head>\n<body>\n<p><a href=\"{u}\">{t}</a></p>\n</body>\n</html>\n")
            .ToString();
    }

    /// <summary>
    /// Lo justo para texto y atributos entre comillas dobles. A mano y no con HtmlEncoder: ese convierte también las
    /// tildes y la ñ en entidades, y algunas tarjetas las enseñan tal cual.
    /// </summary>
    private static string Escapar(string texto) => texto
        .Replace("&", "&amp;", StringComparison.Ordinal)
        .Replace("<", "&lt;", StringComparison.Ordinal)
        .Replace(">", "&gt;", StringComparison.Ordinal)
        .Replace("\"", "&quot;", StringComparison.Ordinal)
        .Replace("'", "&#39;", StringComparison.Ordinal);
}
