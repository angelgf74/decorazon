using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Decorazon.Api.Endpoints;

/// <summary>
/// Extrae el identificador del usuario del token, en un único sitio.
/// </summary>
/// <remarks>
/// Repetir esta lectura en cada endpoint es la forma más fácil de que uno de ellos
/// acabe confiando en un identificador que llega en el cuerpo de la petición, y
/// con él en la posibilidad de operar sobre datos ajenos.
/// </remarks>
public static class UsuarioAutenticado
{
    public static bool TryObtenerId(this ClaimsPrincipal usuario, out Guid id)
    {
        var valor = usuario.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? usuario.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(valor, out id);
    }
}
