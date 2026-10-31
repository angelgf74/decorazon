using System.Threading.RateLimiting;
using Decorazon.Contratos;
using Microsoft.AspNetCore.RateLimiting;

namespace Decorazon.Api.Endpoints;

/// <summary>
/// Límites de frecuencia. Sin ellos, el paso 1 del alta es un cañón de correo
/// contra direcciones de terceros, y el inicio de sesión un banco de pruebas
/// para adivinar contraseñas.
/// </summary>
public static class LimitesDePeticiones
{
    /// <summary>
    /// Lo comparten el alta y el olvido de contraseña: los dos mandan correo a
    /// una dirección que no es la de quien llama, así que el límite cuenta el
    /// total. 10 por IP cada hora; aparte, el caso de uso del alta limita a 3
    /// por correo cada hora.
    /// </summary>
    public const string Registro = "registro";

    public const string InicioDeSesion = "inicio-de-sesion";

    /// <summary>
    /// Verificar la contraseña actual es la misma superficie de ataque que el
    /// inicio de sesión, así que comparte forma. Cubo propio: agotar el de
    /// inicio de sesión no debe bloquear a alguien que solo quiere cambiar su
    /// contraseña, y viceversa. Lo usa también la baja, que pide la contraseña.
    /// </summary>
    public const string CambioDeContrasena = "cambio-de-contrasena";

    public static void AnadirLimitesDePeticiones(this IServiceCollection servicios, IConfiguration configuracion)
    {
        // Configurables para que los tests puedan elevarlos y no chocar con el
        // límite al encadenar peticiones, y bajarlos donde se prueba el 429.
        var maximoDeRegistros = configuracion.GetValue("Limites:RegistrosPorVentana", 10);
        var maximoDeInicios = configuracion.GetValue("Limites:IniciosDeSesionPorVentana", 10);
        var maximoDeCambiosDeContrasena = configuracion.GetValue("Limites:CambiosDeContrasenaPorVentana", 10);

        servicios.AddRateLimiter(opciones =>
        {
            opciones.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Mismo cuerpo que cualquier otro error de la API (y que el 429 por
            // correo del alta): la web enseña el mensaje sin casos especiales.
            opciones.OnRejected = (contexto, cancelacion) =>
                new ValueTask(contexto.HttpContext.Response.WriteAsJsonAsync(
                    new RespuestaDeMensaje("Demasiados intentos seguidos. Espera un rato antes de volver a probar."),
                    cancelacion));

            opciones.AddPolicy(Registro, contexto =>
                RateLimitPartition.GetFixedWindowLimiter(
                    ClaveDeParticion(contexto),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = maximoDeRegistros,
                        Window = TimeSpan.FromHours(1)
                    }));

            opciones.AddPolicy(InicioDeSesion, contexto =>
                RateLimitPartition.GetFixedWindowLimiter(
                    ClaveDeParticion(contexto),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = maximoDeInicios,
                        Window = TimeSpan.FromMinutes(5)
                    }));

            opciones.AddPolicy(CambioDeContrasena, contexto =>
                RateLimitPartition.GetFixedWindowLimiter(
                    ClaveDeParticion(contexto),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = maximoDeCambiosDeContrasena,
                        Window = TimeSpan.FromMinutes(5)
                    }));
        });
    }

    /// <summary>
    /// Se reparte por dirección de origen.
    /// </summary>
    /// <remarks>
    /// Tras el túnel de Cloudflare, <c>RemoteIpAddress</c> sería la del propio
    /// túnel si no se configuraran cabeceras de reenvío, y entonces <b>todos los
    /// usuarios compartirían cubo</b>: bastaría uno activo para dejar sin alta ni
    /// inicio de sesión a los demás. Por eso nginx sobrescribe
    /// <c>X-Forwarded-For</c> con la cabecera de Cloudflare y <c>Program</c>
    /// configura <c>ForwardedHeaders</c> con un único salto de confianza.
    /// </remarks>
    private static string ClaveDeParticion(HttpContext contexto) =>
        contexto.Connection.RemoteIpAddress?.ToString() ?? "desconocido";
}
