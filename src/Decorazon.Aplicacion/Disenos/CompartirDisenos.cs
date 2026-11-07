using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Puertos;

namespace Decorazon.Aplicacion.Disenos;

/// <summary>Cómo acaba subir la vista previa de un diseño.</summary>
public enum ResultadoDeVistaPrevia
{
    Guardada,

    /// <summary>El diseño no existe o es de otro usuario.</summary>
    NoEncontrado,

    /// <summary>No es un JPEG o pasa del tamaño máximo.</summary>
    NoValida
}

/// <summary>
/// Compartir un diseño con un enlace de solo lectura, retirarlo, y leer lo que
/// se comparte (también la imagen de su tarjeta). El dueño solo llega a sus diseños
/// (un diseño ajeno es como uno que no existe); quien lee por enlace no necesita
/// sesión: el enlace hace de permiso.
/// </summary>
public sealed class CompartirDisenos(IRepositorioDeDisenos disenos, IGeneradorDeTokens tokens, IReloj reloj)
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

    /// <summary>La imagen de la tarjeta del enlace; vale aunque el diseño aún no se comparta (se usará al compartirlo).</summary>
    public async Task<ResultadoDeVistaPrevia> GuardarVistaPreviaAsync(Guid usuarioId, Guid id, byte[] imagen, CancellationToken cancelacion = default)
    {
        if (!VistaPrevia.EsValida(imagen))
        {
            return ResultadoDeVistaPrevia.NoValida;
        }

        return await disenos.GuardarVistaPreviaAsync(usuarioId, id, imagen, reloj.Ahora, cancelacion)
            ? ResultadoDeVistaPrevia.Guardada
            : ResultadoDeVistaPrevia.NoEncontrado;
    }

    public Task<VistaPrevia?> ObtenerVistaPreviaAsync(string enlace, CancellationToken cancelacion = default) =>
        TieneFormaDeEnlace(enlace)
            ? disenos.ObtenerVistaPreviaAsync(enlace, cancelacion)
            : Task.FromResult<VistaPrevia?>(null);

    /// <summary>La vista previa de un diseño propio, se comparta o no (la miniatura de «Mis diseños»); null si no la hay o el diseño no es suyo.</summary>
    public Task<VistaPrevia?> ObtenerVistaPreviaDelDuenoAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        disenos.ObtenerVistaPreviaDelDuenoAsync(usuarioId, id, cancelacion);

    /// <summary>Un enlace con forma imposible (vacío, largo, caracteres fuera de base64url) ni se busca.</summary>
    public Task<Diseno?> ObtenerCompartidoAsync(string enlace, CancellationToken cancelacion = default) =>
        TieneFormaDeEnlace(enlace)
            ? disenos.ObtenerCompartidoAsync(enlace, cancelacion)
            : Task.FromResult<Diseno?>(null);

    private static bool TieneFormaDeEnlace(string enlace) =>
        enlace.Length is > 0 and <= LongitudMaximaDelEnlace
        && enlace.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_');
}
