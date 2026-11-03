using Decorazon.Infraestructura.Sugerencias;

namespace Decorazon.Infraestructura.Tests.Sugerencias;

public class OpcionesDeSugerenciasTests
{
    [Fact]
    public void Por_defecto_va_al_buzon_de_produccion_como_Decorazon()
    {
        var opciones = new OpcionesDeSugerencias();

        Assert.False(opciones.UsarServicioReal);
        Assert.Equal("https://gestorsugerencias-api.angelgf.com.es/", opciones.UrlBase);
        Assert.Equal("Decorazon", opciones.Aplicacion);
    }

    [Theory]
    [InlineData("")]
    [InlineData("buzon.test")]
    [InlineData("ftp://buzon.test/")]
    public void Con_el_buzon_activo_y_una_UrlBase_que_no_es_http_no_vale(string urlBase)
    {
        var opciones = new OpcionesDeSugerencias { UsarServicioReal = true, UrlBase = urlBase };

        var excepcion = Assert.Throws<InvalidOperationException>(opciones.Validar);

        Assert.Contains("Sugerencias:UrlBase", excepcion.Message);
    }

    [Fact]
    public void Con_el_buzon_activo_y_sin_nombre_de_aplicacion_no_vale()
    {
        var opciones = new OpcionesDeSugerencias { UsarServicioReal = true, Aplicacion = " " };

        var excepcion = Assert.Throws<InvalidOperationException>(opciones.Validar);

        Assert.Contains("Sugerencias:Aplicacion", excepcion.Message);
    }

    [Fact]
    public void Sin_el_buzon_activo_da_igual_la_UrlBase()
    {
        new OpcionesDeSugerencias { UrlBase = "" }.Validar();
    }

    /// <summary>La dirección del buzón termina siempre en barra: si no, <c>api/Sugerencias</c> sustituiría su último tramo.</summary>
    [Theory]
    [InlineData("https://buzon.test", "https://buzon.test/")]
    [InlineData("https://buzon.test/sugerencias", "https://buzon.test/sugerencias/")]
    [InlineData("https://buzon.test/sugerencias/", "https://buzon.test/sugerencias/")]
    public void La_direccion_base_termina_en_barra(string urlBase, string esperada)
    {
        Assert.Equal(new Uri(esperada), new OpcionesDeSugerencias { UrlBase = urlBase }.DireccionBase());
    }
}
