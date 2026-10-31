using System.ComponentModel.DataAnnotations;
using Decorazon.Contratos.Disenos;

namespace Decorazon.Contratos.Cuentas;

/// <summary>
/// <c>POST /cuentas/registro</c>, paso 1 del alta: el correo y, si la persona
/// ha dibujado algo sin cuenta, el diseño que se guardará al confirmar.
/// </summary>
public sealed class PeticionDeRegistro
{
    [Required(ErrorMessage = "Indica tu correo electrónico.")]
    [EmailAddress(ErrorMessage = "Ese correo electrónico no parece válido.")]
    [MaxLength(254, ErrorMessage = "Ese correo electrónico no parece válido.")]
    public string Correo { get; set; } = string.Empty;

    /// <summary>Opcional. Aquí el nombre también lo es: sin él se usa uno por defecto.</summary>
    public PeticionDeDiseno? Diseno { get; set; }
}

/// <summary>
/// <c>POST /cuentas/registro/confirmar</c>, paso 2. La contraseña viaja aquí, en
/// el cuerpo de un POST, nunca en la URL ni en el enlace del correo.
/// </summary>
public sealed class PeticionDeConfirmarRegistro
{
    [Required(ErrorMessage = "Este enlace no es válido o ha caducado. Pide el alta de nuevo.")]
    public string Token { get; set; } = string.Empty;

    [Required(ErrorMessage = "Indica tu nombre.")]
    [MaxLength(LongitudMaximaDeNombre, ErrorMessage = "Indica tu nombre, de {1} caracteres como mucho.")]
    public string Nombre { get; set; } = string.Empty;

    [Required(ErrorMessage = "Elige una contraseña.")]
    [MinLength(LongitudMinimaDeContrasena,
        ErrorMessage = "La contraseña debe tener al menos {1} caracteres.")]
    [MaxLength(LongitudMaximaDeContrasena,
        ErrorMessage = "La contraseña puede tener {1} caracteres como mucho.")]
    public string Contrasena { get; set; } = string.Empty;

    /// <summary>Deben coincidir con el dominio; se repiten aquí porque Contratos no lo referencia.</summary>
    public const int LongitudMinimaDeContrasena = 12;

    public const int LongitudMaximaDeContrasena = 128;

    public const int LongitudMaximaDeNombre = 100;
}
