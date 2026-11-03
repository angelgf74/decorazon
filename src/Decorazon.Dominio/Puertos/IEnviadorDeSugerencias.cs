using Decorazon.Dominio.Sugerencias;

namespace Decorazon.Dominio.Puertos;

/// <summary>
/// Entrega de sugerencias al autor. El dominio no sabe si detrás está su buzón de
/// sugerencias o la consola.
/// </summary>
/// <remarks>
/// Si el buzón no acepta la sugerencia, lanza <see cref="SugerenciaNoEnviadaException"/>.
/// </remarks>
public interface IEnviadorDeSugerencias
{
    Task EnviarAsync(Sugerencia sugerencia, CancellationToken cancelacion = default);
}

/// <summary>
/// El buzón de sugerencias no ha aceptado el envío (caído, lento, o la rechaza). Los
/// adaptadores traducen a esta excepción sus fallos, para que el caso de uso pueda
/// responder "inténtalo más tarde" sin conocer el buzón.
/// </summary>
public sealed class SugerenciaNoEnviadaException(string mensaje, Exception? causa = null)
    : Exception(mensaje, causa);
