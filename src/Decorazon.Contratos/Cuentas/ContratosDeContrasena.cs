using System.ComponentModel.DataAnnotations;

namespace Decorazon.Contratos.Cuentas;

/// <summary><c>POST /cuentas/contrasena/olvido</c>, paso 1 del restablecimiento: solo el correo.</summary>
public sealed class PeticionDeOlvidoDeContrasena
{
    [Required(ErrorMessage = "Indica tu correo electrónico.")]
    [EmailAddress(ErrorMessage = "Ese correo electrónico no parece válido.")]
    [MaxLength(254, ErrorMessage = "Ese correo electrónico no parece válido.")]
    public string Correo { get; set; } = string.Empty;
}

/// <summary>
/// <c>POST /cuentas/contrasena/restablecer</c>, paso 2. La contraseña viaja aquí,
/// en el cuerpo de un POST, nunca en la URL ni en el enlace del correo.
/// </summary>
public sealed class PeticionDeRestablecerContrasena
{
    [Required(ErrorMessage = "Este enlace no es válido o ha caducado. Pide otro desde el inicio de sesión.")]
    public string Token { get; set; } = string.Empty;

    [Required(ErrorMessage = "Elige una contraseña.")]
    [MinLength(PeticionDeConfirmarRegistro.LongitudMinimaDeContrasena,
        ErrorMessage = "La contraseña debe tener al menos {1} caracteres.")]
    [MaxLength(PeticionDeConfirmarRegistro.LongitudMaximaDeContrasena,
        ErrorMessage = "La contraseña puede tener {1} caracteres como mucho.")]
    public string Contrasena { get; set; } = string.Empty;
}

/// <summary>
/// <c>POST /cuentas/contrasena</c>: cambiarla con la sesión iniciada, sabiendo la actual.
/// </summary>
/// <remarks>
/// Las dos contraseñas viajan en el cuerpo, nunca en la URL: las URL acaban en
/// historiales, logs de proxies y cabeceras Referer.
/// </remarks>
public sealed class PeticionDeCambioDeContrasena
{
    [Required(ErrorMessage = "Escribe tu contraseña actual.")]
    public string Actual { get; set; } = string.Empty;

    [Required(ErrorMessage = "Elige una contraseña nueva.")]
    [MinLength(PeticionDeConfirmarRegistro.LongitudMinimaDeContrasena,
        ErrorMessage = "La contraseña debe tener al menos {1} caracteres.")]
    [MaxLength(PeticionDeConfirmarRegistro.LongitudMaximaDeContrasena,
        ErrorMessage = "La contraseña puede tener {1} caracteres como mucho.")]
    public string Nueva { get; set; } = string.Empty;
}
