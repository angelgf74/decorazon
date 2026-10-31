namespace Decorazon.Api.Tests;

/// <summary>
/// Fuera de desarrollo, un correo mal configurado es un alta y un olvido de
/// contraseña que no funcionan para nadie, sin un solo error visible: la API no
/// debe arrancar. No necesita Docker: falla antes de tocar la base de datos.
/// </summary>
public class CorreoEnProduccionTests
{
    [Fact]
    public void SinBrevoNiOptOutExplicito_NoArranca()
    {
        using var api = new ApiEnProduccion(("Correo:UsarBrevo", "false"));

        var excepcion = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        Assert.Contains("Correo:UsarBrevo", excepcion.Message);
        Assert.Contains("Correo:Simulado", excepcion.Message);
    }

    [Theory]
    [InlineData("http://decorazon.angelgf.com.es")]
    [InlineData("decorazon.angelgf.com.es")]
    [InlineData("")]
    public void ConUnaBaseDeLaWebQueNoEsHttps_NoArranca(string baseDeLaWeb)
    {
        using var api = new ApiEnProduccion(
            ("Correo:ClaveDeApi", "clave-de-prueba"),
            ("Correo:BaseDeLaWeb", baseDeLaWeb));

        var excepcion = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        Assert.Contains("Correo:BaseDeLaWeb", excepcion.Message);
    }

    /// <summary>appsettings.json trae Brevo activo; la clave es el único secreto que falta.</summary>
    [Fact]
    public void SinLaClaveDeBrevo_NoArranca()
    {
        using var api = new ApiEnProduccion();

        var excepcion = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        Assert.Contains("Correo:ClaveDeApi", excepcion.Message);
    }

    /// <summary>Con la clave por variable de entorno, appsettings.json basta: Brevo, remitente y web https.</summary>
    [Fact]
    public void ConLaClaveDeBrevo_ArrancaConLoQueTraeAppsettings()
    {
        using var api = new ApiEnProduccion(("Correo:ClaveDeApi", "clave-de-prueba"));

        using var cliente = api.CreateClient();
    }

    [Fact]
    public void ConUnaCarpetaDeSimulados_NoArranca()
    {
        using var api = new ApiEnProduccion(
            ("Correo:ClaveDeApi", "clave-de-prueba"),
            ("Correo:CarpetaDeSimulados", "/tmp/correos"));

        var excepcion = Assert.Throws<InvalidOperationException>(() => api.CreateClient());

        Assert.Contains("Correo:CarpetaDeSimulados", excepcion.Message);
    }

    [Fact]
    public void ConElOptOutExplicito_ArrancaSinBrevo()
    {
        using var api = new ApiEnProduccion(("Correo:UsarBrevo", "false"), ("Correo:Simulado", "true"));

        using var cliente = api.CreateClient();
    }
}
