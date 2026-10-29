using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Decorazon.Api.Tests;

/// <summary>
/// Qué orígenes pueden llamar a la API desde el navegador. No necesita Docker:
/// la respuesta CORS no depende de la base de datos.
/// </summary>
public class CorsTests
{
    private const string WebLocal = "http://localhost:5321";
    private const string WebDeProduccion = "https://decorazon.angelgf.com.es";

    /// <summary>
    /// Sin <c>Access-Control-Expose-Headers: ETag</c> el navegador esconde la
    /// cabecera a la web, que entonces no puede mandar el <c>If-Match</c>.
    /// </summary>
    [Fact]
    public async Task DesdeElOrigenConfigurado_ExponeETagYLocation()
    {
        using var api = new ApiSinBaseDeDatos(("Cors:Origenes:0", WebLocal));

        var respuesta = await PreguntarDesdeAsync(api, WebLocal);

        Assert.Equal(WebLocal, Assert.Single(respuesta.Headers.GetValues("Access-Control-Allow-Origin")));
        var expuestas = string.Join(",", respuesta.Headers.GetValues("Access-Control-Expose-Headers"))
            .Split(',', StringSplitOptions.TrimEntries);
        Assert.Contains("ETag", expuestas);
        Assert.Contains("Location", expuestas);
    }

    /// <summary>
    /// <c>appsettings.json</c> trae el dominio de producción, y solo ese: la web
    /// local no entra en producción por omisión.
    /// </summary>
    [Fact]
    public async Task PorDefecto_SoloSeAdmiteLaWebDeProduccion()
    {
        using var api = new ApiSinBaseDeDatos();

        var deProduccion = await PreguntarDesdeAsync(api, WebDeProduccion);
        var local = await PreguntarDesdeAsync(api, WebLocal);

        Assert.Equal(WebDeProduccion, Assert.Single(deProduccion.Headers.GetValues("Access-Control-Allow-Origin")));
        Assert.False(local.Headers.Contains("Access-Control-Allow-Origin"));
    }

    /// <summary>
    /// Fuera de Development, una lista vacía es un despliegue mal configurado: la
    /// web no podría hablar con la API, y es mejor que no arranque a que falle
    /// en silencio en el navegador de cada usuario.
    /// </summary>
    [Fact]
    public void SinOrigenesFueraDeDesarrollo_NoArranca()
    {
        using var api = new ApiSinBaseDeDatos(("Cors:Origenes:0", ""));

        var excepcion = Assert.Throws<InvalidOperationException>(() => api.CreateClient());
        Assert.Contains("Cors:Origenes", excepcion.Message);
    }

    private static Task<HttpResponseMessage> PreguntarDesdeAsync(WebApplicationFactory<Program> api, string origen)
    {
        var peticion = new HttpRequestMessage(HttpMethod.Get, "/salud");
        peticion.Headers.Add("Origin", origen);

        return api.CreateClient().SendAsync(peticion);
    }

    private sealed class ApiSinBaseDeDatos(params (string Clave, string Valor)[] ajustes) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder constructor)
        {
            constructor.UseEnvironment("Testing");
            constructor.UseSetting("Jwt:ClaveDeFirma", ApiConPostgresFixture.ClaveDeFirmaDePrueba);
            constructor.UseSetting("Limpieza:Activa", "false");
            // appsettings.json trae Brevo activo (producción); los tests nunca mandan correo.
            constructor.UseSetting("Correo:UsarBrevo", "false");
            constructor.UseSetting(
                "ConnectionStrings:Decorazon",
                "Host=127.0.0.1;Port=1;Database=inexistente;Username=nadie;Password=nada;Timeout=1;Command Timeout=1");

            foreach (var (clave, valor) in ajustes)
            {
                constructor.UseSetting(clave, valor);
            }
        }
    }
}
