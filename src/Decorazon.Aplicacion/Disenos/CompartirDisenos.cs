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

    /// <summary>
    /// Si un guardado del editor se cuela entre la lectura y la escritura, la versión ya no
    /// coincide y no se guarda nada: se relee y se vuelve a intentar.
    /// </summary>
    private const int Intentos = 3;

    /// <returns>El enlace (el mismo si ya se compartía), o null si el diseño no existe o es de otro.</returns>
    public async Task<string?> CompartirAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default)
    {
        for (var intento = 0; intento < Intentos; intento++)
        {
            var diseno = await disenos.ObtenerAsync(usuarioId, id, cancelacion);
            if (diseno is null)
            {
                return null;
            }

            if (diseno.EnlaceCompartido is { } enlace)
            {
                return enlace;
            }

            diseno.Compartir(tokens.GenerarToken());
            if (await disenos.GuardarCambiosAsync(cancelacion))
            {
                return diseno.EnlaceCompartido;
            }
        }

        return null;
    }

    /// <returns>False si el diseño no existe o es de otro; retirar uno que no se comparte es true.</returns>
    public async Task<bool> DejarDeCompartirAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default)
    {
        for (var intento = 0; intento < Intentos; intento++)
        {
            var diseno = await disenos.ObtenerAsync(usuarioId, id, cancelacion);
            if (diseno is null)
            {
                return false;
            }

            if (diseno.EnlaceCompartido is null)
            {
                return true;
            }

            diseno.DejarDeCompartir();
            if (await disenos.GuardarCambiosAsync(cancelacion))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>Un enlace con forma imposible (vacío, largo, caracteres fuera de base64url) ni se busca.</summary>
    public Task<Diseno?> ObtenerCompartidoAsync(string enlace, CancellationToken cancelacion = default) =>
        TieneFormaDeEnlace(enlace)
            ? disenos.ObtenerCompartidoAsync(enlace, cancelacion)
            : Task.FromResult<Diseno?>(null);

    private static bool TieneFormaDeEnlace(string enlace) =>
        enlace.Length is > 0 and <= LongitudMaximaDelEnlace
        && enlace.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_');
}
