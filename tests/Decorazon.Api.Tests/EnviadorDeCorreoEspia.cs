using System.Collections.Concurrent;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Api.Tests;

/// <summary>
/// Enviador de pruebas: guarda los mensajes en vez de entregarlos.
/// Ningún test debe mandar correo real, y es de aquí de donde se saca
/// el token que viaja dentro del enlace.
/// </summary>
public sealed class EnviadorDeCorreoEspia : IEnviadorDeCorreo
{
    private readonly ConcurrentQueue<(string Destinatario, string Enlace)> _enlaces = new();
    private readonly ConcurrentQueue<(string Destinatario, string Enlace)> _enlacesDeContrasena = new();
    private readonly ConcurrentQueue<string> _avisos = new();
    private readonly ConcurrentQueue<string> _cambiosDeContrasena = new();
    private readonly ConcurrentQueue<string> _bajas = new();

    public IReadOnlyCollection<(string Destinatario, string Enlace)> EnlacesDeAlta => _enlaces;

    public IReadOnlyCollection<(string Destinatario, string Enlace)> EnlacesDeContrasena => _enlacesDeContrasena;

    public IReadOnlyCollection<string> AvisosDeCuentaExistente => _avisos;

    public IReadOnlyCollection<string> ConfirmacionesDeCambioDeContrasena => _cambiosDeContrasena;

    public IReadOnlyCollection<string> ConfirmacionesDeBaja => _bajas;

    public Task EnviarEnlaceDeAltaAsync(
        CorreoElectronico destinatario,
        string enlace,
        CancellationToken cancelacion = default)
    {
        _enlaces.Enqueue((destinatario.Valor, enlace));
        return Task.CompletedTask;
    }

    public Task EnviarAvisoDeCuentaExistenteAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default)
    {
        _avisos.Enqueue(destinatario.Valor);
        return Task.CompletedTask;
    }

    public Task EnviarEnlaceDeContrasenaAsync(
        CorreoElectronico destinatario,
        string enlace,
        CancellationToken cancelacion = default)
    {
        _enlacesDeContrasena.Enqueue((destinatario.Valor, enlace));
        return Task.CompletedTask;
    }

    public Task EnviarConfirmacionDeCambioDeContrasenaAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default)
    {
        _cambiosDeContrasena.Enqueue(destinatario.Valor);
        return Task.CompletedTask;
    }

    public Task EnviarConfirmacionDeBajaAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default)
    {
        _bajas.Enqueue(destinatario.Valor);
        return Task.CompletedTask;
    }

    /// <summary>Extrae el token del último enlace de alta enviado a ese destinatario.</summary>
    public string TokenEnviadoA(string destinatario) =>
        TokenDe(_enlaces, destinatario);

    /// <summary>Extrae el token del último enlace de contraseña enviado a ese destinatario.</summary>
    public string TokenDeContrasenaEnviadoA(string destinatario) =>
        TokenDe(_enlacesDeContrasena, destinatario);

    private static string TokenDe(
        IEnumerable<(string Destinatario, string Enlace)> envios,
        string destinatario)
    {
        var enlace = envios.Last(envio => envio.Destinatario == destinatario).Enlace;
        var consulta = System.Web.HttpUtility.ParseQueryString(new Uri(enlace).Query);

        return consulta["token"]
            ?? throw new InvalidOperationException($"El enlace no lleva token: {enlace}");
    }
}
