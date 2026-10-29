using System.Net;
using System.Net.Http.Json;
using Decorazon.Contratos;
using Decorazon.Contratos.Cuentas;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Persistencia;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Decorazon.Api.Tests;

/// <summary>Un proveedor de correo caído: cada envío falla como lo traduciría el adaptador de Brevo.</summary>
public sealed class EnviadorDeCorreoCaido : IEnviadorDeCorreo
{
    public Task EnviarEnlaceDeAltaAsync(CorreoElectronico destinatario, string enlace, CancellationToken cancelacion = default) =>
        Falla();

    public Task EnviarAvisoDeCuentaExistenteAsync(CorreoElectronico destinatario, CancellationToken cancelacion = default) =>
        Falla();

    public Task EnviarEnlaceDeContrasenaAsync(CorreoElectronico destinatario, string enlace, CancellationToken cancelacion = default) =>
        Falla();

    public Task EnviarConfirmacionDeCambioDeContrasenaAsync(CorreoElectronico destinatario, CancellationToken cancelacion = default) =>
        Falla();

    public Task EnviarConfirmacionDeBajaAsync(CorreoElectronico destinatario, CancellationToken cancelacion = default) =>
        Falla();

    private static Task Falla() => throw new CorreoNoEnviadoException("Brevo caído (simulado).");
}

public sealed class ApiConCorreoCaidoFixture : ApiConPostgresFixture
{
    protected override void ConfigureWebHost(IWebHostBuilder constructor)
    {
        base.ConfigureWebHost(constructor);
        constructor.ConfigureTestServices(servicios =>
        {
            servicios.RemoveAll<IEnviadorDeCorreo>();
            servicios.AddSingleton<IEnviadorDeCorreo, EnviadorDeCorreoCaido>();
        });
    }
}

/// <summary>
/// Si el correo no sale, quien pidió el enlace debe saberlo ahora: 503 con un mensaje
/// que invita a reintentar, no un 500 ni un "te lo hemos enviado" que nunca llega.
/// </summary>
[Trait("Categoria", "Integracion")]
public class CorreoCaidoTests(ApiConCorreoCaidoFixture api) : IClassFixture<ApiConCorreoCaidoFixture>
{
    private const string Mensaje = "No hemos podido enviar el correo. Inténtalo dentro de un rato.";

    [Fact]
    public async Task Registro_ConElCorreoCaido_Responde503ConMensaje()
    {
        var respuesta = await api.CreateClient().PostAsJsonAsync(
            "/cuentas/registro", new PeticionDeRegistro { Correo = $"nuevo-{Guid.NewGuid():N}@ejemplo.com" });

        await AssertServicioNoDisponibleAsync(respuesta);
    }

    [Fact]
    public async Task Olvido_ConElCorreoCaido_Responde503ConMensaje()
    {
        var correo = $"con-cuenta-{Guid.NewGuid():N}@ejemplo.com";
        using (var ambito = api.Services.CreateScope())
        {
            var contexto = ambito.ServiceProvider.GetRequiredService<DecorazonDbContext>();
            contexto.Usuarios.Add(Usuario.Crear(
                CorreoElectronico.Crear(correo), NombreDeUsuario.Crear("Ana"), "hash", DateTimeOffset.UtcNow));
            await contexto.SaveChangesAsync();
        }

        var respuesta = await api.CreateClient().PostAsJsonAsync(
            "/cuentas/contrasena/olvido", new PeticionDeOlvidoDeContrasena { Correo = correo });

        await AssertServicioNoDisponibleAsync(respuesta);
    }

    private static async Task AssertServicioNoDisponibleAsync(HttpResponseMessage respuesta)
    {
        Assert.Equal(HttpStatusCode.ServiceUnavailable, respuesta.StatusCode);
        Assert.Equal(Mensaje, (await respuesta.Content.ReadFromJsonAsync<RespuestaDeError>())?.Mensaje);
    }
}
