using System.Net;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Correo;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Decorazon.Infraestructura.Tests.Correo;

/// <summary>
/// Cualquier fallo de entrega de Brevo sale como <see cref="CorreoNoEnviadoException"/>,
/// el contrato del puerto: así la API responde 503 sin saber nada de HTTP.
/// </summary>
public class EnviadorDeCorreoBrevoTests
{
    private static readonly CorreoElectronico Destinatario = CorreoElectronico.Crear("ana@example.com");

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    public async Task Una_respuesta_de_error_de_Brevo_es_CorreoNoEnviado(HttpStatusCode estado)
    {
        var enviador = Enviador(_ => Task.FromResult(new HttpResponseMessage(estado) { Content = new StringContent("{}") }));

        await Assert.ThrowsAsync<CorreoNoEnviadoException>(() =>
            enviador.EnviarEnlaceDeAltaAsync(Destinatario, "https://decorazon.test/x"));
    }

    [Fact]
    public async Task Sin_conexion_con_Brevo_es_CorreoNoEnviado()
    {
        var enviador = Enviador(_ => throw new HttpRequestException("sin red"));

        await Assert.ThrowsAsync<CorreoNoEnviadoException>(() =>
            enviador.EnviarEnlaceDeContrasenaAsync(Destinatario, "https://decorazon.test/x"));
    }

    [Fact]
    public async Task Si_Brevo_no_responde_a_tiempo_es_CorreoNoEnviado()
    {
        var enviador = Enviador(_ => throw new TaskCanceledException("timeout del HttpClient"));

        await Assert.ThrowsAsync<CorreoNoEnviadoException>(() =>
            enviador.EnviarAvisoDeCuentaExistenteAsync(Destinatario));
    }

    [Fact]
    public async Task Si_quien_llama_cancela_la_cancelacion_no_se_disfraza()
    {
        using var cancelacion = new CancellationTokenSource();
        await cancelacion.CancelAsync();
        var enviador = Enviador(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            enviador.EnviarEnlaceDeAltaAsync(Destinatario, "https://decorazon.test/x", cancelacion.Token));
    }

    [Fact]
    public async Task Una_respuesta_correcta_no_lanza()
    {
        var enviador = Enviador(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.Created)));

        await enviador.EnviarEnlaceDeAltaAsync(Destinatario, "https://decorazon.test/x");
    }

    private static EnviadorDeCorreoBrevo Enviador(Func<HttpRequestMessage, Task<HttpResponseMessage>> responder) =>
        new(
            new HttpClient(new ManejadorFalso(responder)) { BaseAddress = new Uri("https://api.brevo.test/") },
            Options.Create(new OpcionesDeCorreo { UsarBrevo = true, ClaveDeApi = "k", CorreoRemitente = "no-responder@example.com" }),
            NullLogger<EnviadorDeCorreoBrevo>.Instance);

    private sealed class ManejadorFalso(Func<HttpRequestMessage, Task<HttpResponseMessage>> responder) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage peticion, CancellationToken cancelacion)
        {
            cancelacion.ThrowIfCancellationRequested();
            return responder(peticion);
        }
    }
}
