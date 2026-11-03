using System.ComponentModel.DataAnnotations;

namespace Decorazon.Contratos.Sugerencias;

/// <summary>
/// <c>POST /sugerencias</c>: una sugerencia para el autor, con sesión o sin ella.
/// </summary>
public sealed class PeticionDeSugerencia
{
    /// <summary>Lo mismo que admite el buzón de sugerencias.</summary>
    public const int LongitudMaximaDelTexto = 2000;

    [Required(ErrorMessage = "Escribe tu sugerencia.")]
    [MaxLength(LongitudMaximaDelTexto, ErrorMessage = "La sugerencia puede tener {1} caracteres como mucho.")]
    public string Texto { get; set; } = string.Empty;

    /// <summary><c>mejora</c>, <c>funcionalidad</c>, <c>error</c>, <c>pregunta</c> u <c>otra</c>.</summary>
    [Required(ErrorMessage = "Elige de qué va tu sugerencia.")]
    public string Tipo { get; set; } = string.Empty;

    /// <summary>
    /// Para poder responderte. Solo cuenta sin sesión: con ella se responde al correo de la
    /// cuenta y este se ignora.
    /// </summary>
    [MaxLength(254, ErrorMessage = "Ese correo electrónico no parece válido.")]
    public string? Correo { get; set; }
}
