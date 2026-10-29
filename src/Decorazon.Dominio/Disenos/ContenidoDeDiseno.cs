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
}

/// <summary>
/// El documento JSON del diseño tal como lo dibuja el editor. El servidor no
/// interpreta los elementos: solo comprueba que el envoltorio es el esperado
/// para no guardar basura ni documentos de un formato que no sabe leer.
/// </summary>
public sealed record ContenidoDeDiseno
{
    public const int TamanoMaximoEnBytes = 1_048_576;

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
            ComprobarTextos(raiz);

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
    /// Fuerza la lectura de cada cadena y nombre de propiedad. El analizador acepta un
    /// escape de sustituto suelto (<c>"\uD800"</c>) y solo falla al materializar el texto;
    /// jsonb de PostgreSQL tampoco lo admite, ni el carácter nulo (<c>"0000"</c>).
    /// Mejor descubrirlo aquí que al guardar.
    /// </summary>
    private static void ComprobarTextos(JsonElement elemento)
    {
        switch (elemento.ValueKind)
        {
            case JsonValueKind.String:
                SinNulo(elemento.GetString());
                break;
            case JsonValueKind.Array:
                foreach (var hijo in elemento.EnumerateArray())
                {
                    ComprobarTextos(hijo);
                }

                break;
            case JsonValueKind.Object:
                foreach (var propiedad in elemento.EnumerateObject())
                {
                    SinNulo(propiedad.Name);
                    ComprobarTextos(propiedad.Value);
                }

                break;
        }
    }

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
