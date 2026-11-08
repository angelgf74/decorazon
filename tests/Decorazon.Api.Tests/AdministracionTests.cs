using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Decorazon.Contratos.Administracion;
using Decorazon.Contratos.Cuentas;

namespace Decorazon.Api.Tests;

/// <summary>
/// La vista de administración: quién tiene cuenta, cuántos diseños guarda y
/// cuánto ocupa en la base de datos. Solo para los correos de la configuración.
/// </summary>
[Trait("Categoria", "Integracion")]
public class AdministracionTests(ApiConAdministradorFixture api) : IClassFixture<ApiConAdministradorFixture>
{
    private const int BytesDeImagen = 3_000;

    /// <summary>Lo justo para pasar por JPEG: la cabecera FF D8 FF y relleno que no se comprime.</summary>
    private static byte[] Jpeg()
    {
        var imagen = new byte[BytesDeImagen];
        imagen[0] = 0xFF;
        imagen[1] = 0xD8;
        imagen[2] = 0xFF;
        var azar = new Random(7);
        azar.NextBytes(imagen.AsSpan(3));
        return imagen;
    }

    private static async Task SubirVistaPreviaAsync(HttpClient cliente, Guid id)
    {
        var cuerpo = new ByteArrayContent(Jpeg());
        cuerpo.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        var respuesta = await cliente.PutAsync($"/disenos/{id}/vista-previa", cuerpo);
        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);
    }

    [Fact]
    public async Task ElAdministrador_VeCadaUsuarioConSusDisenosYSuEspacio()
    {
        var administrador = await api.AdministradorAsync();
        var correoDeAna = $"ana-{Guid.NewGuid():N}@ejemplo.com";
        var correoDeBea = $"bea-{Guid.NewGuid():N}@ejemplo.com";
        var ana = await CuentasDePrueba.ConSesionAsync(api, correoDeAna, "Ana");
        var bea = await CuentasDePrueba.ConSesionAsync(api, correoDeBea, "Bea");

        // Ana: dos diseños, uno de ellos con vista previa. Bea: uno, pequeño.
        var conImagen = await DisenosDePrueba.CrearAsync(ana, "Con imagen");
        await SubirVistaPreviaAsync(ana, conImagen);
        await DisenosDePrueba.CrearAsync(ana, "Otro");
        await DisenosDePrueba.CrearAsync(bea, "El de Bea");

        var respuesta = await administrador.GetAsync("/administracion/usuarios");
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var listado = (await respuesta.Content.ReadFromJsonAsync<RespuestaDeListadoDeUsuarios>())!;

        var filaDeAna = Assert.Single(listado.Usuarios, u => u.Correo == correoDeAna);
        var filaDeBea = Assert.Single(listado.Usuarios, u => u.Correo == correoDeBea);
        var filaDelAdministrador = Assert.Single(listado.Usuarios, u => u.Correo == ApiConAdministradorFixture.CorreoDeAdministrador);

        Assert.Equal("Ana", filaDeAna.Nombre);
        Assert.Equal(2, filaDeAna.Disenos);
        Assert.Equal(1, filaDeBea.Disenos);
        Assert.Equal(0, filaDelAdministrador.Disenos);
        Assert.Equal(0, filaDelAdministrador.Bytes);

        // Un diseño con contenido ocupa algo; la imagen suma al menos sus bytes.
        Assert.True(filaDeBea.Bytes > 0);
        Assert.True(filaDeAna.Bytes >= filaDeBea.Bytes * 2 + BytesDeImagen);

        // De más a menos espacio.
        var bytes = listado.Usuarios.Select(u => u.Bytes).ToList();
        Assert.Equal(bytes.OrderByDescending(b => b), bytes);

        Assert.Equal(listado.Usuarios.Sum(u => u.Disenos), listado.TotalDeDisenos);
        Assert.Equal(listado.Usuarios.Sum(u => u.Bytes), listado.TotalDeBytes);
        Assert.True(filaDeAna.FechaDeAlta > DateTimeOffset.UtcNow.AddMinutes(-5));
    }

    [Fact]
    public async Task UnUsuarioNormal_RecibeProhibido()
    {
        var usuario = await CuentasDePrueba.ConSesionAsync(api);

        var respuesta = await usuario.GetAsync("/administracion/usuarios");

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task SinSesion_RecibeNoAutorizado()
    {
        var respuesta = await api.CreateClient().GetAsync("/administracion/usuarios");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task MiCuenta_DiceSiSoyAdministrador()
    {
        var administrador = await api.AdministradorAsync();
        var usuario = await CuentasDePrueba.ConSesionAsync(api);

        var cuentaDelAdministrador = (await administrador.GetFromJsonAsync<RespuestaDeMiCuenta>("/cuentas/yo"))!;
        var cuentaDelUsuario = (await usuario.GetFromJsonAsync<RespuestaDeMiCuenta>("/cuentas/yo"))!;

        Assert.True(cuentaDelAdministrador.EsAdministrador);
        Assert.False(cuentaDelUsuario.EsAdministrador);
    }
}
