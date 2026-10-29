using System.Net;
using System.Net.Http.Json;
using Decorazon.Contratos.Cuentas;

namespace Decorazon.Api.Tests;

/// <summary>
/// Cambiar la contraseña con la sesión iniciada, sabiendo la actual.
/// </summary>
[Trait("Categoria", "Integracion")]
public class CambioDeContrasenaTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    private const string ContrasenaActual = CuentasDePrueba.Contrasena;
    private const string ContrasenaNueva = "otra-contrasena-larga-y-distinta";

    [Fact]
    public async Task SinSesion_DevuelveNoAutorizado()
    {
        var anonimo = api.CreateClient();

        var respuesta = await anonimo.PostAsJsonAsync("/cuentas/contrasena", new PeticionDeCambioDeContrasena
        {
            Actual = ContrasenaActual,
            Nueva = ContrasenaNueva
        });

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task ConLaActualCorrecta_CambiaYPermiteEntrarConLaNueva()
    {
        var (cliente, correo) = await CuentaAsync();

        var respuesta = await cliente.PostAsJsonAsync("/cuentas/contrasena", new PeticionDeCambioDeContrasena
        {
            Actual = ContrasenaActual,
            Nueva = ContrasenaNueva
        });

        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);

        var conLaNueva = await api.CreateClient().PostAsJsonAsync("/sesiones",
            new PeticionDeInicioDeSesion { Correo = correo, Contrasena = ContrasenaNueva });
        Assert.Equal(HttpStatusCode.OK, conLaNueva.StatusCode);

        var conLaAntigua = await api.CreateClient().PostAsJsonAsync("/sesiones",
            new PeticionDeInicioDeSesion { Correo = correo, Contrasena = ContrasenaActual });
        Assert.Equal(HttpStatusCode.Unauthorized, conLaAntigua.StatusCode);
    }

    /// <summary>
    /// Cambiar la contraseña sube la versión de credenciales: cualquier otra
    /// sesión abierta con la anterior (un móvil perdido, por ejemplo) se cierra.
    /// </summary>
    [Fact]
    public async Task AlCambiar_LasSesionesAnterioresDejanDeValer()
    {
        var (cliente, correo) = await CuentaAsync();
        var otroDispositivo = api.CreateClient();
        await CuentasDePrueba.IniciarSesionAsync(otroDispositivo, correo);
        Assert.Equal(HttpStatusCode.OK, (await otroDispositivo.GetAsync("/cuentas/yo")).StatusCode);

        await cliente.PostAsJsonAsync("/cuentas/contrasena", new PeticionDeCambioDeContrasena
        {
            Actual = ContrasenaActual,
            Nueva = ContrasenaNueva
        });

        Assert.Equal(HttpStatusCode.Unauthorized, (await otroDispositivo.GetAsync("/cuentas/yo")).StatusCode);
    }

    [Fact]
    public async Task ConLaActualIncorrecta_Devuelve400YNoCambiaNada()
    {
        var (cliente, correo) = await CuentaAsync();

        var respuesta = await cliente.PostAsJsonAsync("/cuentas/contrasena", new PeticionDeCambioDeContrasena
        {
            Actual = "esta no es la contraseña",
            Nueva = ContrasenaNueva
        });

        // 400 y no 401: la sesión vale, y un 401 haría que la web la cerrara.
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await cliente.GetAsync("/cuentas/yo")).StatusCode);

        var conLaOriginal = await api.CreateClient().PostAsJsonAsync("/sesiones",
            new PeticionDeInicioDeSesion { Correo = correo, Contrasena = ContrasenaActual });
        Assert.Equal(HttpStatusCode.OK, conLaOriginal.StatusCode);
    }

    [Fact]
    public async Task ContrasenaNuevaDemasiadoCorta_DevuelveDatosNoValidos()
    {
        var (cliente, _) = await CuentaAsync();

        var respuesta = await cliente.PostAsJsonAsync("/cuentas/contrasena", new PeticionDeCambioDeContrasena
        {
            Actual = ContrasenaActual,
            Nueva = "corta"
        });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task AlCambiar_LlegaElCorreoDeAviso()
    {
        var (cliente, correo) = await CuentaAsync();

        await cliente.PostAsJsonAsync("/cuentas/contrasena", new PeticionDeCambioDeContrasena
        {
            Actual = ContrasenaActual,
            Nueva = ContrasenaNueva
        });

        Assert.Contains(correo, api.Correo.ConfirmacionesDeCambioDeContrasena);
    }

    // ------------------------------------------------------------- Auxiliares

    private async Task<(HttpClient Cliente, string Correo)> CuentaAsync()
    {
        var correo = $"cambio-{Guid.NewGuid():N}@ejemplo.com";

        return (await CuentasDePrueba.ConSesionAsync(api, correo, "Ana Pérez"), correo);
    }
}
