using Microsoft.EntityFrameworkCore;

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
}
