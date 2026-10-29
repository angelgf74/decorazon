using System.Net;
using System.Net.Http.Json;
using System.Text;
using Decorazon.Contratos.Cuentas;
using Decorazon.Contratos.Disenos;
using Decorazon.Infraestructura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Decorazon.Api.Tests;

/// <summary>Darse de baja, contra PostgreSQL.</summary>
[Trait("Categoria", "Integracion")]
public class BajaTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    /// <summary>
    /// El criterio que más importa: se va todo lo de la cuenta y nada más.
    /// </summary>
    /// <remarks>
    /// Se cuentan las filas de <b>todas</b> las tablas del modelo, sacadas de EF:
    /// una tabla nueva entra sola en la comprobación. Primero se prepara lo que
    /// debe sobrevivir (Berta, con su diseño) y se toma la foto. Después Alba
    /// crea su cuenta, guarda diseños y pide restablecer la contraseña. Al
    /// borrarla, cada tabla tiene que volver a la foto.
    /// </remarks>
    [Fact]
    public async Task Baja_BorraTodoLoDeLaCuenta_YNadaDeLosDemas()
    {
        var correoDeAlba = CorreoNuevo("alba");

        var berta = await CuentasDePrueba.ConSesionAsync(api, CorreoNuevo("berta"), "Berta");
        var disenoDeBerta = await DisenosDePrueba.CrearAsync(berta, "Salón de Berta");

        var antes = await ContarFilasAsync();

        var alba = await CuentasDePrueba.ConSesionAsync(api, correoDeAlba, "Alba");
        await DisenosDePrueba.CrearAsync(alba, "Uno");
        await DisenosDePrueba.CrearAsync(alba, "Dos");
        await api.CreateClient().PostAsJsonAsync("/cuentas/contrasena/olvido",
            new PeticionDeOlvidoDeContrasena { Correo = correoDeAlba });

        Assert.NotEqual(antes, await ContarFilasAsync());

        var baja = await BorrarAsync(alba, CuentasDePrueba.Contrasena);

        Assert.Equal(HttpStatusCode.NoContent, baja.StatusCode);
        Assert.Equal(antes, await ContarFilasAsync());

        // Berta sigue con su cuenta y su diseño.
        Assert.Equal(HttpStatusCode.OK, (await berta.GetAsync("/cuentas/yo")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await berta.GetAsync($"/disenos/{disenoDeBerta}")).StatusCode);
        Assert.Contains(correoDeAlba, api.Correo.ConfirmacionesDeBaja);
    }

    /// <summary>
    /// Review Focus 5: tras la baja el token viejo no abre nada (la cuenta ya no
    /// existe, así que la versión de credenciales no se encuentra) y en la tabla
    /// de diseños no queda ninguna fila del usuario. Se mira con SQL directo, no
    /// con la API: la API ya no deja preguntar.
    /// </summary>
    [Fact]
    public async Task Baja_ElTokenViejoDa401_YNoQuedanDisenosDelUsuario()
    {
        var correo = CorreoNuevo("se-va");
        var cuenta = await CuentasDePrueba.ConSesionAsync(api, correo, "Se va");
        await DisenosDePrueba.CrearAsync(cuenta, "Uno");
        await DisenosDePrueba.CrearAsync(cuenta, "Dos");
        var usuarioId = await IdDelUsuarioAsync(correo);
        Assert.Equal(2, await ContarDisenosAsync(usuarioId));

        Assert.Equal(HttpStatusCode.NoContent, (await BorrarAsync(cuenta, CuentasDePrueba.Contrasena)).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await cuenta.GetAsync("/disenos")).StatusCode);
        Assert.Equal(0, await ContarDisenosAsync(usuarioId));
    }

    [Fact]
    public async Task Baja_ElCorreoPuedeVolverADarseDeAlta_SinNadaDeAntes()
    {
        var correo = CorreoNuevo("vuelve");
        var cuenta = await CuentasDePrueba.ConSesionAsync(api, correo, "Vuelve");
        await DisenosDePrueba.CrearAsync(cuenta);

        Assert.Equal(HttpStatusCode.NoContent, (await BorrarAsync(cuenta, CuentasDePrueba.Contrasena)).StatusCode);

        var otraVez = await CuentasDePrueba.ConSesionAsync(api, correo, "Vuelve");
        Assert.Empty((await otraVez.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);
    }

    [Fact]
    public async Task Baja_ConContrasenaIncorrecta_400YNoBorraNada()
    {
        var cuenta = await CuentasDePrueba.ConSesionAsync(api);
        var diseno = await DisenosDePrueba.CrearAsync(cuenta);

        var baja = await BorrarAsync(cuenta, "esta-no-es-la-contrasena");

        // 400 y no 401: la sesión vale, y un 401 haría que la web la cerrara.
        Assert.Equal(HttpStatusCode.BadRequest, baja.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await cuenta.GetAsync($"/disenos/{diseno}")).StatusCode);
    }

    [Fact]
    public async Task SinSesion_401()
    {
        var anonimo = api.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await BorrarAsync(anonimo, "lo-que-sea-largo")).StatusCode);
    }

    private static string CorreoNuevo(string quien) => $"{quien}-{Guid.NewGuid():N}@ejemplo.com";

    private static Task<HttpResponseMessage> BorrarAsync(HttpClient cuenta, string contrasena) =>
        cuenta.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/cuentas/yo")
        {
            Content = JsonContent.Create(new PeticionDeBaja { Contrasena = contrasena })
        });

    private async Task<Guid> IdDelUsuarioAsync(string correo)
    {
        await using var conexion = new NpgsqlConnection(api.CadenaDeConexion);
        await conexion.OpenAsync();
        await using var consulta = new NpgsqlCommand("SELECT id FROM usuarios WHERE correo = @correo", conexion);
        consulta.Parameters.AddWithValue("correo", correo);

        return (Guid)(await consulta.ExecuteScalarAsync())!;
    }

    private async Task<long> ContarDisenosAsync(Guid usuarioId)
    {
        await using var conexion = new NpgsqlConnection(api.CadenaDeConexion);
        await conexion.OpenAsync();
        await using var consulta = new NpgsqlCommand("SELECT count(*) FROM disenos WHERE usuario_id = @id", conexion);
        consulta.Parameters.AddWithValue("id", usuarioId);

        return (long)(await consulta.ExecuteScalarAsync())!;
    }

    /// <summary>Filas de cada tabla del modelo, por nombre.</summary>
    private async Task<string> ContarFilasAsync()
    {
        using var ambito = api.Services.CreateScope();
        var tablas = ambito.ServiceProvider.GetRequiredService<DecorazonDbContext>().Model.GetEntityTypes()
            .Select(tipo => tipo.GetTableName())
            .OfType<string>()
            .Distinct()
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.True(tablas.Count >= 4, $"Solo {tablas.Count} tablas en el modelo.");

        await using var conexion = new NpgsqlConnection(api.CadenaDeConexion);
        await conexion.OpenAsync();

        var recuento = new StringBuilder();

        foreach (var tabla in tablas)
        {
            await using var contar = new NpgsqlCommand($"SELECT count(*) FROM \"{tabla}\"", conexion);
            recuento.Append(tabla).Append('=').Append(await contar.ExecuteScalarAsync()).Append(' ');
        }

        return recuento.ToString();
    }
}
