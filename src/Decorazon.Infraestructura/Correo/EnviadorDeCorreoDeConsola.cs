using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;
using Microsoft.Extensions.Logging;

namespace Decorazon.Infraestructura.Correo;

/// <summary>
/// Enviador para desarrollo y pruebas: escribe el mensaje en el log en vez de enviarlo.
/// Es el registrado por defecto, para que ninguna máquina de desarrollo mande
/// correo real a direcciones ajenas por accidente.
/// </summary>
public sealed class EnviadorDeCorreoDeConsola(ILogger<EnviadorDeCorreoDeConsola> registro) : IEnviadorDeCorreo
{
    public Task EnviarEnlaceDeAltaAsync(
        CorreoElectronico destinatario,
        string enlace,
        CancellationToken cancelacion = default)
    {
        // El enlace lleva el token dentro. Se escribe aquí a propósito: sin él no
        // habría forma de completar un alta en local. Por eso este enviador nunca
        // debe activarse en producción, donde ese log sería una fuga.
        registro.LogInformation(
            "[CORREO SIMULADO] Alta para {Destinatario}. Enlace: {Enlace}",
            destinatario.Valor,
            enlace);

        return Task.CompletedTask;
    }

    public Task EnviarEnlaceDeContrasenaAsync(
        CorreoElectronico destinatario,
        string enlace,
        CancellationToken cancelacion = default)
    {
        registro.LogInformation(
            "[CORREO SIMULADO] Restablecer contraseña de {Destinatario}. Enlace: {Enlace}",
            destinatario.Valor,
            enlace);

        return Task.CompletedTask;
    }

    public Task EnviarAvisoDeCuentaExistenteAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default)
    {
        registro.LogInformation(
            "[CORREO SIMULADO] Aviso de cuenta ya existente para {Destinatario}.",
            destinatario.Valor);

        return Task.CompletedTask;
    }

    public Task EnviarConfirmacionDeCambioDeContrasenaAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default)
    {
        registro.LogInformation(
            "[CORREO SIMULADO] Contraseña cambiada: {Destinatario}.",
            destinatario.Valor);

        return Task.CompletedTask;
    }

    public Task EnviarConfirmacionDeBajaAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default)
    {
        registro.LogInformation(
            "[CORREO SIMULADO] Cuenta borrada: {Destinatario}.",
            destinatario.Valor);

        return Task.CompletedTask;
    }
}
