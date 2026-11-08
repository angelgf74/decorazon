using Microsoft.AspNetCore.Hosting;

namespace Decorazon.Api.Tests;

/// <summary>
/// La API con un correo en <c>Administracion:Correos</c>: la cuenta que se
/// registre con él es administradora. El resto de tests arrancan sin ninguno.
/// </summary>
public class ApiConAdministradorFixture : ApiConPostgresFixture
{
    public const string CorreoDeAdministrador = "admin@ejemplo.com";

    private readonly SemaphoreSlim _cerrojo = new(1, 1);
    private bool _administradorDadoDeAlta;

    /// <summary>
    /// Un cliente con la sesión del administrador. La cuenta se da de alta la
    /// primera vez; después solo se inicia sesión (el correo es único).
    /// </summary>
    public async Task<HttpClient> AdministradorAsync()
    {
        await _cerrojo.WaitAsync();
        try
        {
            if (!_administradorDadoDeAlta)
            {
                _administradorDadoDeAlta = true;
                return await CuentasDePrueba.ConSesionAsync(this, CorreoDeAdministrador, "Quien administra");
            }
        }
        finally
        {
            _cerrojo.Release();
        }

        var cliente = CreateClient();
        await CuentasDePrueba.IniciarSesionAsync(cliente, CorreoDeAdministrador);
        return cliente;
    }

    protected override void ConfigureWebHost(IWebHostBuilder constructor)
    {
        base.ConfigureWebHost(constructor);
        // Con otra caja: la comparación no distingue mayúsculas, como el correo del dominio.
        constructor.UseSetting("Administracion:Correos:0", "Admin@Ejemplo.com");
    }
}
