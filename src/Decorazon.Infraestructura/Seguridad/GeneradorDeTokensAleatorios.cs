using System.Security.Cryptography;
using System.Text;
using Decorazon.Dominio.Puertos;

namespace Decorazon.Infraestructura.Seguridad;

/// <summary>
/// Tokens de un solo uso de 256 bits, generados con el generador criptográfico
/// del sistema. Nunca <c>Guid.NewGuid()</c>: un Guid es un identificador, no un
/// secreto, y buena parte de sus bits son predecibles.
/// </summary>
public sealed class GeneradorDeTokensAleatorios : IGeneradorDeTokens
{
    private const int BytesDeEntropia = 32;

    public string GenerarToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(BytesDeEntropia);

        // Base64url: viaja en una URL sin necesitar escapes.
        return Base64Url(bytes);
    }

    /// <summary>
    /// SHA-256 basta aquí: el token son 256 bits aleatorios, así que no hay
    /// nada que adivinar por fuerza bruta y una derivación lenta solo añadiría
    /// latencia. Las contraseñas sí la necesitan porque las eligen humanos.
    /// </summary>
    public string Hashear(string token)
    {
        ArgumentException.ThrowIfNullOrEmpty(token);

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
}
