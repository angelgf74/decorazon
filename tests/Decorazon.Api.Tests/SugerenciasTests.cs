using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Decorazon.Contratos;
using Decorazon.Contratos.Sugerencias;
using Decorazon.Dominio.Sugerencias;

namespace Decorazon.Api.Tests;

/// <summary>
/// <c>POST /sugerencias</c>: con sesión se responde al correo de la cuenta; sin ella, al que
/// se escriba. Nada se guarda en Decorazon: llega al buzón o se le dice a quien la manda.
/// </summary>
[Trait("Categoria", "Integracion")]
public class SugerenciasTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    [Fact]
    public async Task SinSesion_ConCorreo_Responde204YLlegaConEseCorreo()
    {
        var texto = TextoUnico();

        var respuesta = await api.CreateClient().PostAsJsonAsync("/sugerencias",
            new PeticionDeSugerencia { Texto = texto, Tipo = "error", Correo = "Ana@Ejemplo.com" });

        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);
        var enviada = Assert.Single(api.Sugerencias.ConTexto(texto));
        Assert.Equal("ana@ejemplo.com", enviada.Correo.Valor);
        Assert.Equal(TipoDeSugerencia.Error, enviada.Tipo);
    }

    [Fact]
    public async Task SinSesion_SinCorreo_Responde400ConMensajeYNoSeEnvia()
    {
        var texto = TextoUnico();

        var respuesta = await api.CreateClient().PostAsJsonAsync("/sugerencias",
            new PeticionDeSugerencia { Texto = texto, Tipo = "mejora" });

        await AssertMensajeAsync(HttpStatusCode.BadRequest, respuesta);
        Assert.Empty(api.Sugerencias.ConTexto(texto));
    }

    /// <summary>La identidad sale del token, nunca del cuerpo: no se puede firmar con el correo de otro.</summary>
    [Fact]
    public async Task ConSesion_LlegaConElCorreoDeLaCuenta_NoConElDelCuerpo()
    {
        var correo = $"cuenta-{Guid.NewGuid():N}@ejemplo.com";
        var cliente = await CuentasDePrueba.ConSesionAsync(api, correo, "Ana");
        var texto = TextoUnico();

        var respuesta = await cliente.PostAsJsonAsync("/sugerencias",
            new PeticionDeSugerencia { Texto = texto, Tipo = "mejora", Correo = "otro@ejemplo.com" });

        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);
        Assert.Equal(correo, Assert.Single(api.Sugerencias.ConTexto(texto)).Correo.Valor);
    }

    /// <summary>
    /// Un token que ya no vale (sesión cerrada en otro sitio, caducada o falsa) no se trata como
    /// "sin sesión": el 401 hace que la web cierre la suya, en vez de pedir un correo sin explicar.
    /// </summary>
    [Fact]
    public async Task ConUnTokenQueNoVale_Responde401YNoSeEnvia()
    {
        var cliente = api.CreateClient();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "no.es.un-token");
        var texto = TextoUnico();

        var respuesta = await cliente.PostAsJsonAsync("/sugerencias",
            new PeticionDeSugerencia { Texto = texto, Tipo = "mejora", Correo = "ana@ejemplo.com" });

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
        Assert.Empty(api.Sugerencias.ConTexto(texto));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task UnTextoVacio_Responde400ConMensaje(string texto)
    {
        var respuesta = await api.CreateClient().PostAsJsonAsync("/sugerencias",
            new PeticionDeSugerencia { Texto = texto, Tipo = "mejora", Correo = "ana@ejemplo.com" });

        await AssertMensajeAsync(HttpStatusCode.BadRequest, respuesta);
    }

    [Fact]
    public async Task UnTextoDemasiadoLargo_Responde400ConMensaje()
    {
        var texto = new string('a', PeticionDeSugerencia.LongitudMaximaDelTexto + 1);

        var respuesta = await api.CreateClient().PostAsJsonAsync("/sugerencias",
            new PeticionDeSugerencia { Texto = texto, Tipo = "mejora", Correo = "ana@ejemplo.com" });

        await AssertMensajeAsync(HttpStatusCode.BadRequest, respuesta);
        Assert.Empty(api.Sugerencias.ConTexto(texto));
    }

    [Fact]
    public async Task UnTipoQueNoExiste_Responde400ConMensajeYNoSeEnvia()
    {
        var texto = TextoUnico();

        var respuesta = await api.CreateClient().PostAsJsonAsync("/sugerencias",
            new PeticionDeSugerencia { Texto = texto, Tipo = "queja", Correo = "ana@ejemplo.com" });

        await AssertMensajeAsync(HttpStatusCode.BadRequest, respuesta);
        Assert.Empty(api.Sugerencias.ConTexto(texto));
    }

    /// <summary>El buzón solo admite 200 caracteres: un 400 claro, no el 502 que daría si se le mandara.</summary>
    [Fact]
    public async Task UnCorreoMasLargoDeLoQueAdmiteElBuzon_Responde400ConMensaje()
    {
        var correo = new string('a', 190) + "@ejemplo.com";
        var texto = TextoUnico();

        var respuesta = await api.CreateClient().PostAsJsonAsync("/sugerencias",
            new PeticionDeSugerencia { Texto = texto, Tipo = "mejora", Correo = correo });

        var mensaje = await AssertMensajeAsync(HttpStatusCode.BadRequest, respuesta);
        Assert.Contains("200", mensaje);
        Assert.Empty(api.Sugerencias.ConTexto(texto));
    }

    /// <summary>
    /// Decorazon no guarda la sugerencia: un 204 aquí la perdería sin que nadie se enterase.
    /// 502 porque falla un servicio del que depende, no la propia API.
    /// </summary>
    [Fact]
    public async Task SiElBuzonFalla_Responde502ConMensaje()
    {
        api.Sugerencias.BuzonCaido = true;
        try
        {
            var respuesta = await api.CreateClient().PostAsJsonAsync("/sugerencias",
                new PeticionDeSugerencia { Texto = TextoUnico(), Tipo = "mejora", Correo = "ana@ejemplo.com" });

            await AssertMensajeAsync(HttpStatusCode.BadGateway, respuesta);
        }
        finally
        {
            api.Sugerencias.BuzonCaido = false;
        }
    }

    private static string TextoUnico() => $"Sugerencia {Guid.NewGuid():N}";

    private static async Task<string> AssertMensajeAsync(HttpStatusCode esperado, HttpResponseMessage respuesta)
    {
        Assert.Equal(esperado, respuesta.StatusCode);
        var mensaje = (await respuesta.Content.ReadFromJsonAsync<RespuestaDeMensaje>())?.Mensaje;
        Assert.False(string.IsNullOrWhiteSpace(mensaje));
        return mensaje!;
    }
}
