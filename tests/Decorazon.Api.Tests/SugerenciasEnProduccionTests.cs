using Decorazon.Dominio.Puertos;
using Decorazon.Infraestructura.Sugerencias;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Decorazon.Api.Tests;

/// <summary>
/// Fuera de desarrollo, un buzón apagado son sugerencias que acaban en el log sin que nadie
/// las lea: la API no debe arrancar. Dentro, al revés: nada sale al buzón real aunque la
/// configuración lo pida. No necesita Docker.
/// </summary>
public class SugerenciasEnProduccionTests
{
    /// <summary>appsettings.json trae Brevo activo: sin su clave la API no arrancaría por el correo.</summary>
    private static readonly (string, string) ClaveDeBrevo = ("Correo:ClaveDeApi", "clave-de-prueba");

    [Fact]
    public void SinBuzonNiOptOutExplicito_NoArranca()
    {
        using var api = new ApiEnProduccion(ClaveDeBrevo, ("Sugerencias:UsarServicioReal", "false"));

        var excepcion = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        Assert.Contains("Sugerencias:UsarServicioReal", excepcion.Message);
        Assert.Contains("Sugerencias:Simulado", excepcion.Message);
    }

    [Fact]
    public void ConElOptOutExplicito_ArrancaSinBuzon()
    {
        using var api = new ApiEnProduccion(
            ClaveDeBrevo,
            ("Sugerencias:UsarServicioReal", "false"),
            ("Sugerencias:Simulado", "true"));

        Assert.IsType<EnviadorDeSugerenciasDeConsola>(EnviadorDe(api.Services));
    }

    [Fact]
    public void ConUnBuzonQueNoEsHttps_NoArranca()
    {
        using var api = new ApiEnProduccion(ClaveDeBrevo, ("Sugerencias:UrlBase", "http://gestorsugerencias-api.angelgf.com.es/"));

        var excepcion = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        Assert.Contains("Sugerencias:UrlBase", excepcion.Message);
    }

    /// <summary>Con lo que trae appsettings.json, producción entrega al buzón real.</summary>
    [Fact]
    public void ConLoQueTraeAppsettings_UsaElBuzonReal()
    {
        using var api = new ApiEnProduccion(ClaveDeBrevo);

        Assert.IsType<EnviadorDeSugerenciasHttp>(EnviadorDe(api.Services));
    }

    /// <summary>
    /// appsettings.json trae el buzón activo y un appsettings.Development.json copiado antes de
    /// existir esta sección no lo apagaría: en desarrollo y en los tests se fuerza la consola.
    /// </summary>
    [Fact]
    public void EnLosTests_NuncaSeUsaElBuzonReal_AunqueLoPidaLaConfiguracion()
    {
        using var enPruebas = new ApiSinBaseDeDatos();
        using var api = enPruebas.WithWebHostBuilder(constructor =>
            constructor.UseSetting("Sugerencias:UsarServicioReal", "true"));

        Assert.IsType<EnviadorDeSugerenciasDeConsola>(EnviadorDe(api.Services));
    }

    private static IEnviadorDeSugerencias EnviadorDe(IServiceProvider servicios)
    {
        using var ambito = servicios.CreateScope();
        return ambito.ServiceProvider.GetRequiredService<IEnviadorDeSugerencias>();
    }
}
