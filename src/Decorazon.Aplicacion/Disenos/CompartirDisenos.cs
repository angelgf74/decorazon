using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Puertos;

namespace Decorazon.Aplicacion.Disenos;

/// <summary>
/// Compartir un diseño con un enlace de solo lectura, retirarlo, y leer lo que
/// se comparte. El dueño solo llega a sus diseños (un diseño ajeno es como uno
/// que no existe); quien lee por enlace no necesita sesión: el enlace hace de permiso.
/// </summary>
public sealed class CompartirDisenos(IRepositorioDeDisenos disenos, IGeneradorDeTokens tokens)
{
    /// <summary>Lo que mide como mucho un enlace válido: lo demás ni se busca.</summary>
    public const int LongitudMaximaDelEnlace = 64;

    /// <returns>El enlace (el mismo si ya se compartía), o null si el diseño no existe o es de otro.</returns>
    /// <remarks>Se genera uno nuevo cada vez; si el diseño ya tenía enlace, el repositorio lo conserva y este se descarta.</remarks>
    public Task<string?> CompartirAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        disenos.CompartirAsync(usuarioId, id, tokens.GenerarToken(), cancelacion);

    /// <returns>False si el diseño no existe o es de otro; retirar uno que no se comparte es true.</returns>
    public Task<bool> DejarDeCompartirAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        disenos.DejarDeCompartirAsync(usuarioId, id, cancelacion);

    /// <summary>Un enlace con forma imposible (vacío, largo, caracteres fuera de base64url) ni se busca.</summary>
    public Task<Diseno?> ObtenerCompartidoAsync(string enlace, CancellationToken cancelacion = default) =>
        TieneFormaDeEnlace(enlace)
            ? disenos.ObtenerCompartidoAsync(enlace, cancelacion)
            : Task.FromResult<Diseno?>(null);

    private static bool TieneFormaDeEnlace(string enlace) =>
        enlace.Length is > 0 and <= LongitudMaximaDelEnlace
        && enlace.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_');
}
