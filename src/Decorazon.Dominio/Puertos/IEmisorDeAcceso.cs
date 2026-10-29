using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Puertos;

/// <summary>Emite la credencial con la que el usuario prueba su identidad en peticiones posteriores.</summary>
public interface IEmisorDeAcceso
{
    AccesoEmitido Emitir(Usuario usuario);
}

/// <param name="Token">Credencial firmada.</param>
/// <param name="Caducidad">Momento a partir del cual deja de ser válida.</param>
public sealed record AccesoEmitido(string Token, DateTimeOffset Caducidad);
