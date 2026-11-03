using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Decorazon.Contratos.Disenos;

namespace Decorazon.Api.Tests;

/// <summary>
/// La vista previa de un diseño compartido: el dueño sube la imagen, y la tarjeta (lo que leen WhatsApp y
/// compañía) y la imagen se sirven sin sesión mientras el diseño se comparta.
/// </summary>
[Trait("Categoria", "Integracion")]
public class VistaPreviaTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    /// <summary>Lo justo para pasar por JPEG: la cabecera FF D8 FF y algo de relleno.</summary>
    private static byte[] Jpeg(int bytes = 2_000)
    {
        var imagen = new byte[bytes];
        imagen[0] = 0xFF;
        imagen[1] = 0xD8;
        imagen[2] = 0xFF;
        for (var i = 3; i < bytes; i++) imagen[i] = (byte)(i % 251);
        return imagen;
    }

    private static Task<HttpResponseMessage> SubirAsync(HttpClient cliente, Guid id, byte[] imagen, string tipo = "image/jpeg")
    {
        var cuerpo = new ByteArrayContent(imagen);
        cuerpo.Headers.ContentType = new MediaTypeHeaderValue(tipo);
        return cliente.PutAsync($"/disenos/{id}/vista-previa", cuerpo);
    }

    private static async Task<string> CompartirAsync(HttpClient cliente, Guid id) =>
        (await (await cliente.PutAsync($"/disenos/{id}/enlace", null)).Content.ReadFromJsonAsync<RespuestaDeEnlace>())!.Enlace;

    [Fact]
    public async Task SubirLaImagen_SeSirveSinSesionMientrasSeComparte()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);
        var enlace = await CompartirAsync(dueno, id);
        var imagen = Jpeg();

        Assert.Equal(HttpStatusCode.NoContent, (await SubirAsync(dueno, id, imagen)).StatusCode);

        var respuesta = await api.CreateClient().GetAsync($"/compartidos/{enlace}/imagen");
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Equal("image/jpeg", respuesta.Content.Headers.ContentType?.MediaType);
        Assert.Equal(imagen, await respuesta.Content.ReadAsByteArrayAsync());
        Assert.True(respuesta.Headers.CacheControl?.Public);
        Assert.Equal("nosniff", respuesta.Headers.GetValues("X-Content-Type-Options").Single());

        Assert.Equal(HttpStatusCode.NoContent, (await dueno.DeleteAsync($"/disenos/{id}/enlace")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync($"/compartidos/{enlace}/imagen")).StatusCode);
    }

    [Fact]
    public async Task SinImagenSubida_LaImagenDa404()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var enlace = await CompartirAsync(dueno, await DisenosDePrueba.CrearAsync(dueno));

        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync($"/compartidos/{enlace}/imagen")).StatusCode);
    }

    [Fact]
    public async Task SubirOtraVez_SustituyeLaImagen()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);
        var enlace = await CompartirAsync(dueno, id);
        await SubirAsync(dueno, id, Jpeg(2_000));
        var nueva = Jpeg(3_000);

        Assert.Equal(HttpStatusCode.NoContent, (await SubirAsync(dueno, id, nueva)).StatusCode);

        Assert.Equal(nueva, await api.CreateClient().GetByteArrayAsync($"/compartidos/{enlace}/imagen"));
    }

    [Fact]
    public async Task UnDisenoAjeno_NoAdmiteImagen_YSinSesionTampoco()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var otro = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);

        Assert.Equal(HttpStatusCode.NotFound, (await SubirAsync(otro, id, Jpeg())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await SubirAsync(api.CreateClient(), id, Jpeg())).StatusCode);
    }

    [Fact]
    public async Task LoQueNoEsUnJpeg_OEsDemasiadoGrande_Responde400_YOtroTipo415()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);

        Assert.Equal(HttpStatusCode.BadRequest, (await SubirAsync(dueno, id, "no es una imagen"u8.ToArray())).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SubirAsync(dueno, id, Jpeg(300 * 1024 + 1))).StatusCode);
        // Otro tipo de contenido ni llega: la ruta solo acepta image/jpeg.
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await SubirAsync(dueno, id, Jpeg(), "image/png")).StatusCode);
    }

    [Fact]
    public async Task LaTarjeta_LlevaElNombreEscapado_LaImagenConSuVersion_YLaDireccionDeLaWeb()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno, "Baño <b>\"de\"</b> & arriba");
        var enlace = await CompartirAsync(dueno, id);
        await SubirAsync(dueno, id, Jpeg());

        var respuesta = await api.CreateClient().GetAsync($"/compartidos/{enlace}/tarjeta");
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Equal("text/html", respuesta.Content.Headers.ContentType?.MediaType);
        Assert.True(respuesta.Headers.CacheControl?.NoStore);
        var html = await respuesta.Content.ReadAsStringAsync();

        Assert.DoesNotContain("<b>", html);
        Assert.Contains("og:title", html);
        Assert.Contains("Baño &lt;b&gt;", html);
        Assert.Matches($"og:image\" content=\"http://localhost/compartidos/{enlace}/imagen\\?v=\\d+\"", html);
        Assert.Contains($"og:url\" content=\"https://decorazon.test/compartido/{enlace}\"", html);
        Assert.Contains("summary_large_image", html);
        // Sin redirección: un navegador que nginx tome por lector de tarjetas (el de la app de Pinterest) no entra en bucle.
        Assert.DoesNotContain("http-equiv=\"refresh\"", html);
        Assert.Equal("nosniff", respuesta.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Contains("Diseño de dormitorio compartido con Decorazon", html);
    }

    [Fact]
    public async Task LaTarjetaSinImagen_LlevaElIconoDeLaWeb()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var enlace = await CompartirAsync(dueno, await DisenosDePrueba.CrearAsync(dueno));

        var html = await api.CreateClient().GetStringAsync($"/compartidos/{enlace}/tarjeta");

        Assert.Contains("og:image\" content=\"https://decorazon.test/iconos/icono-512.png\"", html);
    }

    [Fact]
    public async Task LaTarjetaDeUnEnlaceRetirado_EsGenerica_SinElNombre()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno, "Mi baño secreto");
        var enlace = await CompartirAsync(dueno, id);
        await dueno.DeleteAsync($"/disenos/{id}/enlace");

        var respuesta = await api.CreateClient().GetAsync($"/compartidos/{enlace}/tarjeta");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
        Assert.DoesNotContain("secreto", await respuesta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task LaTarjetaYLaImagen_RespondenAHead()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);
        var enlace = await CompartirAsync(dueno, id);
        await SubirAsync(dueno, id, Jpeg());
        var anonimo = api.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await anonimo.SendAsync(new HttpRequestMessage(HttpMethod.Head, $"/compartidos/{enlace}/tarjeta"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await anonimo.SendAsync(new HttpRequestMessage(HttpMethod.Head, $"/compartidos/{enlace}/imagen"))).StatusCode);
    }

    [Fact]
    public async Task LaTarjetaDeUnEnlaceQueNoFunciona_EsGenerica_Y404()
    {
        var respuesta = await api.CreateClient().GetAsync("/compartidos/noexiste/tarjeta");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
        Assert.Equal("text/html", respuesta.Content.Headers.ContentType?.MediaType);
        var html = await respuesta.Content.ReadAsStringAsync();
        Assert.Contains("og:title\" content=\"Decorazon\"", html);
    }
}
