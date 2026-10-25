using System.Net.Http.Json;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Decorazon.Infraestructura.Correo;

/// <summary>
/// Entrega por la API HTTP de correo transaccional de Brevo.
/// </summary>
/// <remarks>
/// Se usa la API en lugar del relé SMTP: los errores llegan con detalle y no
/// depende de que el servidor tenga puertos SMTP salientes abiertos.
/// </remarks>
public sealed class EnviadorDeCorreoBrevo(
    HttpClient cliente,
    IOptions<OpcionesDeCorreo> opciones,
    ILogger<EnviadorDeCorreoBrevo> registro) : IEnviadorDeCorreo
{
    private readonly OpcionesDeCorreo _opciones = opciones.Value;

    public Task EnviarEnlaceDeAltaAsync(
        CorreoElectronico destinatario,
        string enlace,
        CancellationToken cancelacion = default) =>
        EnviarAsync(
            destinatario,
            MensajesDeCorreo.AsuntoDeAlta,
            MensajesDeCorreo.CuerpoDeAlta(enlace),
            MensajesDeCorreo.TextoDeAlta(enlace),
            cancelacion);

    public Task EnviarAvisoDeCuentaExistenteAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default) =>
        EnviarAsync(
            destinatario,
            MensajesDeCorreo.AsuntoDeCuentaExistente,
            MensajesDeCorreo.CuerpoDeCuentaExistente(),
            MensajesDeCorreo.TextoDeCuentaExistente(),
            cancelacion);

    public Task EnviarEnlaceDeContrasenaAsync(
        CorreoElectronico destinatario,
        string enlace,
        CancellationToken cancelacion = default) =>
        EnviarAsync(
            destinatario,
            MensajesDeCorreo.AsuntoDeContrasena,
            MensajesDeCorreo.CuerpoDeContrasena(enlace),
            MensajesDeCorreo.TextoDeContrasena(enlace),
            cancelacion);

    public Task EnviarConfirmacionDeCambioDeContrasenaAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default) =>
        EnviarAsync(
            destinatario,
            MensajesDeCorreo.AsuntoDeCambioDeContrasena,
            MensajesDeCorreo.CuerpoDeCambioDeContrasena(),
            MensajesDeCorreo.TextoDeCambioDeContrasena(),
            cancelacion);

    public Task EnviarConfirmacionDeBajaAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default) =>
        EnviarAsync(
            destinatario,
            MensajesDeCorreo.AsuntoDeBaja,
            MensajesDeCorreo.CuerpoDeBaja(),
            MensajesDeCorreo.TextoDeBaja(),
            cancelacion);

    private async Task EnviarAsync(
        CorreoElectronico destinatario,
        string asunto,
        string cuerpoHtml,
        string cuerpoTexto,
        CancellationToken cancelacion)
    {
        var peticion = new
        {
            sender = new { email = _opciones.CorreoRemitente, name = _opciones.NombreRemitente },
            to = new[] { new { email = destinatario.Valor } },
            subject = asunto,
            htmlContent = cuerpoHtml,

            // Alternativa en texto plano. Un correo solo-HTML es una señal de spam
            // clásica: el correo legítimo casi siempre lleva las dos partes.
            textContent = cuerpoTexto,

            // Una dirección de respuesta real hace el mensaje menos sospechoso que
            // un remitente que no admite respuesta y nada más.
            replyTo = new { email = _opciones.CorreoDeRespuesta, name = _opciones.NombreRemitente },

            // Cabeceras propias de correo transaccional. Le dicen al filtro que esto
            // responde a una acción del usuario y no es un envío masivo.
            headers = new Dictionary<string, string>
            {
                ["X-Decorazon-Tipo"] = "transaccional",
                ["Auto-Submitted"] = "auto-generated"
            }
        };

        var respuesta = await cliente.PostAsJsonAsync("v3/smtp/email", peticion, cancelacion);

        if (respuesta.IsSuccessStatusCode)
        {
            return;
        }

        var detalle = await respuesta.Content.ReadAsStringAsync(cancelacion);

        // El destinatario y el motivo sí se registran; el enlace con el token, no.
        // Agotar la cuota de Brevo deja el alta inutilizable, así que este log es
        // la forma de enterarse antes que por los usuarios.
        registro.LogError(
            "Brevo rechazó el envío a {Destinatario}. Estado {Estado}. Detalle: {Detalle}",
            destinatario.Valor,
            (int)respuesta.StatusCode,
            detalle);

        throw new InvalidOperationException(
            $"No se pudo enviar el correo (Brevo respondió {(int)respuesta.StatusCode}).");
    }
}
