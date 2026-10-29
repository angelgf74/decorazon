using System.Text;
using System.Text.Json;

namespace Decorazon.Dominio.Disenos;

public enum ResultadoDeContenido
{
    Valido,
    Vacio,
    Demasiado,
    NoEsJson,
    NoEsObjeto,
    FormatoNoAdmitido,
    FaltanPartes,

    /// <summary>Un número con exponente o de más de <see cref="ContenidoDeDiseno.LongitudMaximaDeNumero"/> caracteres.</summary>
    NumeroNoAdmitido,
}

/// <summary>
/// El documento JSON del diseño tal como lo dibuja el editor. El servidor no
/// interpreta los elementos: solo comprueba que el envoltorio es el esperado
/// para no guardar basura ni documentos de un formato que no sabe leer.
/// </summary>
public sealed record ContenidoDeDiseno
{
    public const int TamanoMaximoEnBytes = 1_048_576;

    /// <summary>Caracteres del texto crudo de un número, signo y punto incluidos.</summary>
    public const int LongitudMaximaDeNumero = 32;

    public static readonly IReadOnlySet<int> FormatosAdmitidos = new HashSet<int> { 1 };

    private static readonly UTF8Encoding Estricta = new(false, true);

    private ContenidoDeDiseno(string json) => Json = json;

    public string Json { get; }

    /// <summary>
    /// Solo para rehidratar desde el almacén un contenido que ya se validó al entrar.
    /// No valida: jsonb devuelve el documento reformateado (espacios tras ':' y ',',
    /// números expandidos) y puede pesar más que el límite de entrada; revalidarlo
    /// haría ilegible un diseño correcto. Para datos externos, usar <see cref="Validar"/>.
    /// </summary>
    public static ContenidoDeDiseno Reconstruir(string json)
    {
        ArgumentException.ThrowIfNullOrEmpty(json);
        return new ContenidoDeDiseno(json);
    }

    /// <summary>
    /// Nunca lanza. El tamaño se mide antes de analizar para que un documento
    /// enorme no cueste memoria ni tiempo de análisis.
    /// </summary>
    public static ResultadoDeContenido Validar(string? json, out ContenidoDeDiseno? contenido)
    {
        contenido = null;

        if (string.IsNullOrWhiteSpace(json))
        {
            return ResultadoDeContenido.Vacio;
        }

        try
        {
            // Estricto: un sustituto suelto no es texto válido y no se codifica.
            if (Estricta.GetByteCount(json) > TamanoMaximoEnBytes)
            {
                return ResultadoDeContenido.Demasiado;
            }

            using var documento = JsonDocument.Parse(Estricta.GetBytes(json));
            var raiz = documento.RootElement;
            if (!ComprobarValores(raiz))
            {
                return ResultadoDeContenido.NumeroNoAdmitido;
            }

            if (raiz.ValueKind != JsonValueKind.Object)
            {
                return ResultadoDeContenido.NoEsObjeto;
            }

            if (!raiz.TryGetProperty("formato", out var formato)
                || formato.ValueKind != JsonValueKind.Number
                || !formato.TryGetInt32(out var numeroDeFormato)
                || !FormatosAdmitidos.Contains(numeroDeFormato))
            {
                return ResultadoDeContenido.FormatoNoAdmitido;
            }

            if (!Es(raiz, "estancia", JsonValueKind.Object)
                || !Es(raiz, "aberturas", JsonValueKind.Array)
                || !Es(raiz, "estructura", JsonValueKind.Array)
                || !Es(raiz, "elementos", JsonValueKind.Array))
            {
                return ResultadoDeContenido.FaltanPartes;
            }

            contenido = new ContenidoDeDiseno(json);
            return ResultadoDeContenido.Valido;
        }
        catch (Exception e) when (e is JsonException or ArgumentException or InvalidOperationException)
        {
            return ResultadoDeContenido.NoEsJson;
        }
    }

    /// <summary>
    /// Recorre todo el documento. Fuerza la lectura de cada cadena y nombre de propiedad:
    /// el analizador acepta un escape de sustituto suelto (<c>"\uD800"</c>) y solo falla al
    /// materializar el texto, y jsonb de PostgreSQL tampoco lo admite, ni el escape del
    /// carácter nulo (<c>"\u0000"</c>). Esos casos lanzan <see cref="JsonException"/>.
    /// Mejor descubrirlo aquí que al guardar.
    /// </summary>
    /// <returns>
    /// <c>false</c> si hay un número que no se admite. jsonb guarda cada número como
    /// <c>numeric</c> exacto: <c>1e200000</c> se expandiría a doscientos mil dígitos o
    /// haría fallar el guardado (22003). El editor solo escribe cotas en notación
    /// decimal corta, así que basta con rechazar el exponente y los textos largos.
    /// </returns>
    private static bool ComprobarValores(JsonElement elemento)
    {
        switch (elemento.ValueKind)
        {
            case JsonValueKind.String:
                SinNulo(elemento.GetString());
                return true;
            case JsonValueKind.Number:
                return EsNumeroAdmitido(elemento.GetRawText());
            case JsonValueKind.Array:
                foreach (var hijo in elemento.EnumerateArray())
                {
                    if (!ComprobarValores(hijo))
                    {
                        return false;
                    }
                }

                return true;
            case JsonValueKind.Object:
                foreach (var propiedad in elemento.EnumerateObject())
                {
                    SinNulo(propiedad.Name);
                    if (!ComprobarValores(propiedad.Value))
                    {
                        return false;
                    }
                }

                return true;
            default:
                return true;
        }
    }

    private static bool EsNumeroAdmitido(string textoCrudo) =>
        textoCrudo.Length <= LongitudMaximaDeNumero
        && textoCrudo.IndexOfAny(['e', 'E']) < 0;

    private static void SinNulo(string? texto)
    {
        if (texto is not null && texto.Contains('\0'))
        {
            throw new JsonException("El carácter nulo no se admite en jsonb.");
        }
    }

    private static bool Es(JsonElement objeto, string propiedad, JsonValueKind tipo) =>
        objeto.TryGetProperty(propiedad, out var valor) && valor.ValueKind == tipo;
}
