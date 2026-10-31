using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;
using Microsoft.Extensions.Logging;

namespace Decorazon.Infraestructura.Correo;

/// <summary>
/// Enviador para las pruebas E2E: además de registrar el mensaje como el de consola, lo
/// escribe en un fichero de texto para que el test lea el enlace sin tocar el log.
/// Solo se activa con <c>Correo:CarpetaDeSimulados</c>, que fuera de Development y Testing se rechaza.
/// </summary>
public sealed class EnviadorDeCorreoACarpeta(string carpeta, ILogger<EnviadorDeCorreoDeConsola> registro) : IEnviadorDeCorreo
{
    private readonly EnviadorDeCorreoDeConsola _consola = new(registro);

    public async Task EnviarEnlaceDeAltaAsync(
        CorreoElectronico destinatario, string enlace, CancellationToken cancelacion = default)
    {
        await _consola.EnviarEnlaceDeAltaAsync(destinatario, enlace, cancelacion);
        await EscribirAsync(destinatario, MensajesDeCorreo.AsuntoDeAlta, MensajesDeCorreo.TextoDeAlta(enlace), cancelacion);
    }

    public async Task EnviarAvisoDeCuentaExistenteAsync(
        CorreoElectronico destinatario, CancellationToken cancelacion = default)
    {
        await _consola.EnviarAvisoDeCuentaExistenteAsync(destinatario, cancelacion);
        await EscribirAsync(
            destinatario, MensajesDeCorreo.AsuntoDeCuentaExistente, MensajesDeCorreo.TextoDeCuentaExistente(), cancelacion);
    }

    public async Task EnviarEnlaceDeContrasenaAsync(
        CorreoElectronico destinatario, string enlace, CancellationToken cancelacion = default)
    {
        await _consola.EnviarEnlaceDeContrasenaAsync(destinatario, enlace, cancelacion);
        await EscribirAsync(
            destinatario, MensajesDeCorreo.AsuntoDeContrasena, MensajesDeCorreo.TextoDeContrasena(enlace), cancelacion);
    }

    public async Task EnviarConfirmacionDeCambioDeContrasenaAsync(
        CorreoElectronico destinatario, CancellationToken cancelacion = default)
    {
        await _consola.EnviarConfirmacionDeCambioDeContrasenaAsync(destinatario, cancelacion);
        await EscribirAsync(
            destinatario,
            MensajesDeCorreo.AsuntoDeCambioDeContrasena,
            MensajesDeCorreo.TextoDeCambioDeContrasena(),
            cancelacion);
    }

    public async Task EnviarConfirmacionDeBajaAsync(
        CorreoElectronico destinatario, CancellationToken cancelacion = default)
    {
        await _consola.EnviarConfirmacionDeBajaAsync(destinatario, cancelacion);
        await EscribirAsync(destinatario, MensajesDeCorreo.AsuntoDeBaja, MensajesDeCorreo.TextoDeBaja(), cancelacion);
    }

    private async Task EscribirAsync(
        CorreoElectronico destinatario, string asunto, string cuerpo, CancellationToken cancelacion)
    {
        Directory.CreateDirectory(carpeta);

        var nombre = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}.txt";
        var contenido = $"Para: {destinatario.Valor}\nAsunto: {asunto}\n\n{cuerpo}";

        // Se escribe aparte y se renombra al final: quien lea los .txt nunca ve un correo a medio escribir.
        var temporal = Path.Combine(carpeta, nombre + ".tmp");
        await File.WriteAllTextAsync(temporal, contenido, cancelacion);
        File.Move(temporal, Path.Combine(carpeta, nombre));
    }
}
