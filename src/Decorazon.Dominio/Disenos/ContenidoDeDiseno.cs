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
        catch (Exception e) when (e is JsonException or ArgumentException)
        {
            return ResultadoDeContenido.NoEsJson;
        }
    }

    private static bool Es(JsonElement objeto, string propiedad, JsonValueKind tipo) =>
        objeto.TryGetProperty(propiedad, out var valor) && valor.ValueKind == tipo;
}
