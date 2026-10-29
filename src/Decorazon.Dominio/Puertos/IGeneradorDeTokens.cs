namespace Decorazon.Dominio.Puertos;

/// <summary>
/// Generación de secretos de un solo uso. La implementación debe usar un
/// generador criptográficamente seguro: nunca <c>Guid.NewGuid()</c> ni <c>Random</c>.
/// </summary>
public interface IGeneradorDeTokens
{
    /// <summary>Devuelve el token en claro, que solo viaja al usuario por correo.</summary>
    string GenerarToken();

    /// <summary>Hash del token, que es lo único que se persiste.</summary>
    string Hashear(string token);
}
