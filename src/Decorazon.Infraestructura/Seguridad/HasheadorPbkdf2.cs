using System.Security.Cryptography;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Infraestructura.Seguridad;

/// <summary>
/// Deriva contraseñas con PBKDF2-HMAC-SHA256 y sal aleatoria por contraseña.
/// </summary>
/// <remarks>
/// El formato almacenado lleva algoritmo e iteraciones dentro
/// (<c>pbkdf2-sha256$iteraciones$sal$hash</c>), de modo que subir el coste
/// o cambiar de algoritmo no invalida lo ya guardado: cada hash se verifica
/// con los parámetros con los que se creó.
/// </remarks>
public sealed class HasheadorPbkdf2 : IHasheadorDeContrasenas
{
    private const string Etiqueta = "pbkdf2-sha256";
    private const int Iteraciones = 210_000;
    private const int TamanoDeSal = 16;
    private const int TamanoDeHash = 32;

    private readonly Lazy<string> _hashSenuelo = new(() =>
        HashearTexto("contrasena-senuelo-que-nunca-coincide"));

    /// <inheritdoc />
    public string HashSenuelo => _hashSenuelo.Value;

    public string Hashear(Contrasena contrasena)
    {
        ArgumentNullException.ThrowIfNull(contrasena);

        return HashearTexto(contrasena.Valor);
    }

    public bool Verificar(string contrasenaEnClaro, string hashAlmacenado)
    {
        if (string.IsNullOrEmpty(contrasenaEnClaro) || string.IsNullOrEmpty(hashAlmacenado))
        {
            return false;
        }

        var partes = hashAlmacenado.Split('$');

        if (partes.Length != 4 || partes[0] != Etiqueta || !int.TryParse(partes[1], out var iteraciones))
        {
            return false;
        }

        byte[] sal;
        byte[] esperado;

        try
        {
            sal = Convert.FromBase64String(partes[2]);
            esperado = Convert.FromBase64String(partes[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        var calculado = Rfc2898DeriveBytes.Pbkdf2(
            contrasenaEnClaro,
            sal,
            iteraciones,
            HashAlgorithmName.SHA256,
            esperado.Length);

        // Comparación en tiempo constante: una comparación normal se detiene en el
        // primer byte distinto y filtra información por el tiempo de respuesta.
        return CryptographicOperations.FixedTimeEquals(calculado, esperado);
    }

    private static string HashearTexto(string texto)
    {
        var sal = RandomNumberGenerator.GetBytes(TamanoDeSal);

        var hash = Rfc2898DeriveBytes.Pbkdf2(
            texto,
            sal,
            Iteraciones,
            HashAlgorithmName.SHA256,
            TamanoDeHash);

        return $"{Etiqueta}${Iteraciones}${Convert.ToBase64String(sal)}${Convert.ToBase64String(hash)}";
    }
}
