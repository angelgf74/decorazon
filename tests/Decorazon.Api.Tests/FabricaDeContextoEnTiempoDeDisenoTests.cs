using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Decorazon.Api.Tests;

/// <summary>
/// La fábrica que usa el bundle de migraciones al desplegar. Sin base de
/// datos: comparar el modelo con la instantánea de las migraciones no abre conexión.
/// </summary>
public class FabricaDeContextoEnTiempoDeDisenoTests
{
    /// <summary>
    /// Si la fábrica configurara el contexto distinto que la API —por ejemplo,
    /// sin snake_case—, el bundle vería un modelo que no es el de las
    /// migraciones y aplicaría lo que no toca en producción.
    /// </summary>
    [Fact]
    public void VeElMismoModeloQueLasMigraciones()
    {
        using var contexto = FabricaDeContextoEnTiempoDeDiseno.Crear("Host=localhost;Database=sin-conexion");

        Assert.False(contexto.Database.HasPendingModelChanges());
    }

    /// <summary>
    /// <c>srv subir</c> compila el bundle en local sin secretos: construir el
    /// modelo no abre conexión, y en el servidor el bundle recibe la cadena por
    /// variable de entorno. Sin cadena configurada no puede fallar.
    /// </summary>
    [Fact]
    public void SinCadenaConfiguradaUsaUnaDeRellenoParaCompilarElBundle()
    {
        var configuracion = new ConfigurationBuilder().Build();

        Assert.Equal(
            FabricaDeContextoEnTiempoDeDiseno.CadenaSinConexion,
            FabricaDeContextoEnTiempoDeDiseno.CadenaDeConexion(configuracion));
    }

    [Fact]
    public void ConCadenaConfiguradaUsaEsa()
    {
        var configuracion = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Decorazon"] = "Host=local;Database=decorazon",
            })
            .Build();

        Assert.Equal("Host=local;Database=decorazon", FabricaDeContextoEnTiempoDeDiseno.CadenaDeConexion(configuracion));
    }
}
