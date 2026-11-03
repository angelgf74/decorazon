using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Sugerencias;

/// <summary>
/// Una sugerencia para el autor de la aplicación, con el correo al que responderla.
/// No se guarda en Decorazon: se entrega al buzón de sugerencias y nada más.
/// </summary>
public sealed record Sugerencia(CorreoElectronico Correo, TextoDeSugerencia Texto, TipoDeSugerencia Tipo)
{
    /// <summary>
    /// El buzón de sugerencias admite correos de hasta 200 caracteres, menos que los
    /// <see cref="CorreoElectronico.LongitudMaxima"/> de una cuenta.
    /// </summary>
    public const int LongitudMaximaDelCorreo = 200;
}
