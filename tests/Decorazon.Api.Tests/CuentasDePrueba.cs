using System.Net.Http.Headers;
using System.Net.Http.Json;
using Decorazon.Contratos.Cuentas;

namespace Decorazon.Api.Tests;

/// <summary>
/// Da de alta una cuenta completa por la API y devuelve un cliente HTTP con su
/// sesión iniciada. Para los tests que necesitan "un usuario cualquiera" y no
/// prueban el alta en sí.
/// </summary>
public static class CuentasDePrueba
{
    public const string Contrasena = "una-contrasena-larga";

    public static Task<HttpClient> ConSesionAsync(ApiConPostgresFixture api) =>
        ConSesionAsync(api, $"usuario-{Guid.NewGuid():N}@ejemplo.com", "Usuario de prueba");

    /// <summary>Lo mismo, con el correo y el nombre elegidos: para los tests que cruzan cuentas.</summary>
    public static async Task<HttpClient> ConSesionAsync(ApiConPostgresFixture api, string correo, string nombre)
    {
        var cliente = api.CreateClient();

        await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro { Correo = correo });

        var confirmada = await cliente.PostAsJsonAsync("/cuentas/registro/confirmar", new PeticionDeConfirmarRegistro
        {
            Token = api.Correo.TokenEnviadoA(correo),
            Nombre = nombre,
            Contrasena = Contrasena
        });
        confirmada.EnsureSuccessStatusCode();

        await IniciarSesionAsync(cliente, correo);

        return cliente;
    }

    /// <summary>Inicia sesión con <see cref="Contrasena"/> y pone el token en el cliente.</summary>
    public static async Task IniciarSesionAsync(HttpClient cliente, string correo)
    {
        var sesion = await cliente.PostAsJsonAsync("/sesiones",
            new PeticionDeInicioDeSesion { Correo = correo, Contrasena = Contrasena });
        var acceso = await sesion.Content.ReadFromJsonAsync<RespuestaDeInicioDeSesion>()
            ?? throw new InvalidOperationException("No se pudo iniciar sesión con la cuenta de prueba.");

        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", acceso.Token);
    }
}
