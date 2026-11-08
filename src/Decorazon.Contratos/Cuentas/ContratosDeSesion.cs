using System.ComponentModel.DataAnnotations;

namespace Decorazon.Contratos.Cuentas;

/// <summary><c>POST /sesiones</c>.</summary>
public sealed class PeticionDeInicioDeSesion
{
    [Required(ErrorMessage = "Indica tu correo electrónico.")]
    [EmailAddress(ErrorMessage = "Ese correo electrónico no parece válido.")]
    public string Correo { get; set; } = string.Empty;

    [Required(ErrorMessage = "Indica tu contraseña.")]
    public string Contrasena { get; set; } = string.Empty;
}

/// <param name="Token">JWT que el cliente enviará en la cabecera <c>Authorization</c>.</param>
/// <param name="Caducidad">
/// Cuándo deja de valer como muy tarde. Puede dejar de valer antes: cambiar o
/// restablecer la contraseña, o borrar la cuenta, lo invalida.
/// </param>
public sealed record RespuestaDeInicioDeSesion(string Token, DateTimeOffset Caducidad);

/// <summary>Respuesta de <c>GET /cuentas/yo</c>: quién es el usuario de la sesión.</summary>
/// <param name="EsAdministrador">
/// Si su correo está en <c>Administracion:Correos</c>: puede entrar en la vista de
/// administración. La web lo usa para enseñar el enlace; la API lo comprueba por su cuenta.
/// </param>
public sealed record RespuestaDeMiCuenta(string Nombre, string Correo, bool EsAdministrador);

/// <summary>
/// <c>DELETE /cuentas/yo</c>: borrar la cuenta entera, con sus diseños.
/// </summary>
/// <remarks>
/// La contraseña va en el cuerpo del <c>DELETE</c>, nunca en la URL: las URL
/// acaban en historiales, logs de proxies y cabeceras Referer.
/// </remarks>
public sealed class PeticionDeBaja
{
    [Required(ErrorMessage = "Escribe tu contraseña para confirmar.")]
    public string Contrasena { get; set; } = string.Empty;
}
