using System.Text;

namespace Decorazon.Dominio.Sugerencias;

/// <summary>
/// Lo que el usuario escribe en una sugerencia: sin espacios en los extremos, con sus
/// saltos de línea, y solo texto que el buzón del autor puede guardar.
/// </summary>
public sealed class TextoDeSugerencia
{
    /// <summary>Lo mismo que admite el buzón de sugerencias.</summary>
    public const int LongitudMaxima = 2000;

    private static readonly UTF8Encoding Utf8Estricto = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

    private TextoDeSugerencia(string valor) => Valor = valor;

    public string Valor { get; }

    public static bool TryCrear(string? entrada, out TextoDeSugerencia texto)
    {
        texto = null!;

        if (string.IsNullOrWhiteSpace(entrada))
        {
            return false;
        }

        var recortado = entrada.Trim();

        // El buzón lo guarda en PostgreSQL: el nulo no cabe en una columna de texto (22021) y
        // un sustituto suelto no se puede pasar a UTF-8. Tabuladores y saltos de línea sí valen.
        if (recortado.Length > LongitudMaxima
            || recortado.Any(c => char.IsControl(c) && c is not ('\n' or '\r' or '\t'))
            || !EsUtf16Valido(recortado))
        {
            return false;
        }

        texto = new TextoDeSugerencia(recortado);
        return true;
    }

    private static bool EsUtf16Valido(string valor)
    {
        try
        {
            Utf8Estricto.GetByteCount(valor);
            return true;
        }
        catch (EncoderFallbackException)
        {
            return false;
        }
    }

    public override string ToString() => Valor;
}
