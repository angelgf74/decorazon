using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Decorazon.Contratos.Cuentas;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Decorazon.Api.Tests;

/// <summary>
/// Recorre el alta completa contra PostgreSQL real: solicitud, correo, elección
/// de contraseña, inicio de sesión y uso del token en un endpoint protegido.
/// </summary>
[Trait("Categoria", "Integracion")]
public class AltaYSesionTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    private const string ContrasenaValida = "una-contrasena-larga";

    [Fact]
    public async Task AltaCompleta_PermiteIniciarSesionYUsarElToken()
    {
        var cliente = api.CreateClient();
        var correo = CorreoUnico();

        var solicitud = await cliente.PostAsJsonAsync("/cuentas/registro",
            new PeticionDeRegistro { Correo = correo });
        Assert.Equal(HttpStatusCode.OK, solicitud.StatusCode);

        var token = api.Correo.TokenEnviadoA(correo);

        var confirmar = await cliente.PostAsJsonAsync("/cuentas/registro/confirmar",
            new PeticionDeConfirmarRegistro { Token = token, Nombre = "Ana Pérez", Contrasena = ContrasenaValida });
        Assert.Equal(HttpStatusCode.OK, confirmar.StatusCode);

        var sesion = await cliente.PostAsJsonAsync("/sesiones",
            new PeticionDeInicioDeSesion { Correo = correo, Contrasena = ContrasenaValida });
        Assert.Equal(HttpStatusCode.OK, sesion.StatusCode);

        var acceso = await sesion.Content.ReadFromJsonAsync<RespuestaDeInicioDeSesion>();
        Assert.NotNull(acceso);
        Assert.False(string.IsNullOrWhiteSpace(acceso.Token));
        Assert.True(acceso.Caducidad > DateTimeOffset.UtcNow);

        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", acceso.Token);
        var yo = await cliente.GetAsync("/cuentas/yo");

        Assert.Equal(HttpStatusCode.OK, yo.StatusCode);
        var identidad = await yo.Content.ReadFromJsonAsync<RespuestaDeMiCuenta>();
        Assert.NotNull(identidad);
        Assert.Equal(correo, identidad.Correo);
        Assert.Equal("Ana Pérez", identidad.Nombre);
    }

    /// <summary>
    /// El enlace apunta a la pantalla de confirmar el alta de la web: si
    /// aterrizara en otro sitio, el usuario tendría que volver a empezar.
    /// </summary>
    [Fact]
    public async Task ElEnlaceApuntaALaPantallaDeConfirmar()
    {
        var correo = CorreoUnico();

        await api.CreateClient().PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo });

        var enlace = api.Correo.EnlacesDeAlta.Last(envio => envio.Destinatario == correo).Enlace;

        Assert.StartsWith($"{ApiConPostgresFixture.BaseDeLaWeb}/registro/confirmar?token=", enlace);
    }

    [Fact]
    public async Task Yo_Responde401SinToken()
    {
        var respuesta = await api.CreateClient().GetAsync("/cuentas/yo");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Yo_Responde401ConUnTokenInventado()
    {
        var cliente = api.CreateClient();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "esto.no.es-un-jwt");

        Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.GetAsync("/cuentas/yo")).StatusCode);
    }

    /// <summary>El criterio central del paso 1: la respuesta no puede delatar qué correos existen.</summary>
    [Fact]
    public async Task Solicitud_RespondeIgual_ExistaONoLaCuenta()
    {
        var cliente = api.CreateClient();
        var registrado = CorreoUnico();

        await CrearCuentaAsync(cliente, registrado);

        var conCuenta = await cliente.PostAsJsonAsync("/cuentas/registro",
            new PeticionDeRegistro { Correo = registrado });
        var sinCuenta = await cliente.PostAsJsonAsync("/cuentas/registro",
            new PeticionDeRegistro { Correo = CorreoUnico() });

        Assert.Equal(conCuenta.StatusCode, sinCuenta.StatusCode);
        Assert.Equal(
            await conCuenta.Content.ReadAsStringAsync(),
            await sinCuenta.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// Tres solicitudes por correo y hora en el caso de uso, aparte del límite
    /// por IP: la cuarta es un 429 aunque el limitador aún tenga sitio.
    /// </summary>
    [Fact]
    public async Task CuartaSolicitudDelMismoCorreoEnUnaHora_Responde429()
    {
        var cliente = api.CreateClient();
        var correo = CorreoUnico();

        for (var intento = 0; intento < 3; intento++)
        {
            Assert.Equal(HttpStatusCode.OK,
                (await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo })).StatusCode);
        }

        var cuarta = await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo });

        Assert.Equal(HttpStatusCode.TooManyRequests, cuarta.StatusCode);
        Assert.Equal(3, api.Correo.EnlacesDeAlta.Count(envio => envio.Destinatario == correo));
    }

    [Fact]
    public async Task ElToken_NoSirveDosVeces()
    {
        var cliente = api.CreateClient();
        var correo = CorreoUnico();

        await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo });
        var token = api.Correo.TokenEnviadoA(correo);

        var peticion = new PeticionDeConfirmarRegistro { Token = token, Nombre = "Ana Pérez", Contrasena = ContrasenaValida };

        Assert.Equal(HttpStatusCode.OK,
            (await cliente.PostAsJsonAsync("/cuentas/registro/confirmar", peticion)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await cliente.PostAsJsonAsync("/cuentas/registro/confirmar", peticion)).StatusCode);
    }

    [Fact]
    public async Task ContrasenaCorta_NoCreaLaCuenta()
    {
        var cliente = api.CreateClient();
        var correo = CorreoUnico();

        await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo });
        var token = api.Correo.TokenEnviadoA(correo);

        var confirmar = await cliente.PostAsJsonAsync("/cuentas/registro/confirmar",
            new PeticionDeConfirmarRegistro { Token = token, Nombre = "Ana Pérez", Contrasena = "corta" });
        Assert.Equal(HttpStatusCode.BadRequest, confirmar.StatusCode);

        var sesion = await cliente.PostAsJsonAsync("/sesiones",
            new PeticionDeInicioDeSesion { Correo = correo, Contrasena = "corta" });
        Assert.Equal(HttpStatusCode.Unauthorized, sesion.StatusCode);
    }

    [Fact]
    public async Task SolicitudPendiente_NoPermiteIniciarSesion()
    {
        var cliente = api.CreateClient();
        var correo = CorreoUnico();

        // Se pide el alta pero no se confirma: esa dirección todavía no es una cuenta.
        await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo });

        var sesion = await cliente.PostAsJsonAsync("/sesiones",
            new PeticionDeInicioDeSesion { Correo = correo, Contrasena = ContrasenaValida });

        Assert.Equal(HttpStatusCode.Unauthorized, sesion.StatusCode);
    }

    [Fact]
    public async Task CredencialesIncorrectas_RespondenIgual_ExistaONoElCorreo()
    {
        var cliente = api.CreateClient();
        var registrado = CorreoUnico();
        await CrearCuentaAsync(cliente, registrado);

        var contrasenaMala = await cliente.PostAsJsonAsync("/sesiones",
            new PeticionDeInicioDeSesion { Correo = registrado, Contrasena = "otra-contrasena-larga" });
        var correoInexistente = await cliente.PostAsJsonAsync("/sesiones",
            new PeticionDeInicioDeSesion { Correo = CorreoUnico(), Contrasena = ContrasenaValida });

        Assert.Equal(HttpStatusCode.Unauthorized, contrasenaMala.StatusCode);
        Assert.Equal(contrasenaMala.StatusCode, correoInexistente.StatusCode);
        Assert.Equal(
            await contrasenaMala.Content.ReadAsStringAsync(),
            await correoInexistente.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task CorreoInvalido_Responde400()
    {
        var respuesta = await api.CreateClient().PostAsJsonAsync("/cuentas/registro",
            new PeticionDeRegistro { Correo = "esto-no-es-un-correo" });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task ElErrorDeEnlaceInvalido_NoDevuelveElToken()
    {
        var respuesta = await api.CreateClient().PostAsJsonAsync("/cuentas/registro/confirmar",
            new PeticionDeConfirmarRegistro { Token = "token-inventado", Nombre = "Ana Pérez", Contrasena = ContrasenaValida });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);

        // Devolver el token en el error lo dejaría escrito en cualquier log de cliente.
        Assert.DoesNotContain("token-inventado", await respuesta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Confirmar_SinNombre_Responde400YNoGastaElEnlace()
    {
        var cliente = api.CreateClient();
        var correo = CorreoUnico();

        await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo });
        var token = api.Correo.TokenEnviadoA(correo);

        var sinNombre = await cliente.PostAsJsonAsync("/cuentas/registro/confirmar",
            new PeticionDeConfirmarRegistro { Token = token, Nombre = "   ", Contrasena = ContrasenaValida });
        Assert.Equal(HttpStatusCode.BadRequest, sinNombre.StatusCode);

        var conNombre = await cliente.PostAsJsonAsync("/cuentas/registro/confirmar",
            new PeticionDeConfirmarRegistro { Token = token, Nombre = "Ana Pérez", Contrasena = ContrasenaValida });
        Assert.Equal(HttpStatusCode.OK, conNombre.StatusCode);
    }

    /// <summary>
    /// Mira las filas de verdad, no lo que dice el caso de uso: un adaptador que
    /// guardara el valor equivocado pasaría todos los tests de aplicación.
    /// </summary>
    [Fact]
    public async Task NiLaContrasenaNiElToken_SeGuardanEnClaro()
    {
        var cliente = api.CreateClient();
        var correo = CorreoUnico();

        await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo });
        var token = api.Correo.TokenEnviadoA(correo);

        await cliente.PostAsJsonAsync("/cuentas/registro/confirmar",
            new PeticionDeConfirmarRegistro { Token = token, Nombre = "Ana Pérez", Contrasena = ContrasenaValida });

        using var ambito = api.Services.CreateScope();
        var contexto = ambito.ServiceProvider.GetRequiredService<DecorazonDbContext>();

        var hashDeContrasena = await contexto.Usuarios
            .Where(usuario => usuario.Correo == CorreoElectronico.Crear(correo))
            .Select(usuario => usuario.HashDeContrasena)
            .SingleAsync();

        Assert.DoesNotContain(ContrasenaValida, hashDeContrasena);
        Assert.StartsWith("pbkdf2-sha256$", hashDeContrasena);

        var hashesDeTokens = await contexto.SolicitudesDeRegistro
            .Where(solicitud => solicitud.Correo == CorreoElectronico.Crear(correo))
            .Select(solicitud => solicitud.HashDelToken)
            .ToListAsync();

        Assert.NotEmpty(hashesDeTokens);
        Assert.DoesNotContain(token, hashesDeTokens);
    }

    private static string CorreoUnico() => $"usuario-{Guid.NewGuid():N}@ejemplo.com";

    private async Task CrearCuentaAsync(HttpClient cliente, string correo)
    {
        await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo });

        var confirmar = await cliente.PostAsJsonAsync("/cuentas/registro/confirmar",
            new PeticionDeConfirmarRegistro
            {
                Token = api.Correo.TokenEnviadoA(correo),
                Nombre = "Ana Pérez",
                Contrasena = ContrasenaValida
            });

        Assert.Equal(HttpStatusCode.OK, confirmar.StatusCode);
    }
}
