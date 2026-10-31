using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Decorazon.Api.Tests;

/// <summary>
/// En producción cada consulta SQL ocupaba una línea del journal (149 de 219 tras
/// el primer recorrido) y tapaba lo importante. Los parámetros salen ocultos,
/// pero no hacen falta: los errores de base de datos siguen llegando.
/// </summary>
public class LogEnProduccionTests
{
    private const string ComandosSql = "Microsoft.EntityFrameworkCore.Database.Command";

    [Fact]
    public void NoRegistraCadaConsultaSqlPeroSiSusErrores()
    {
        using var api = new ApiEnProduccion(("Correo:ClaveDeApi", "clave-de-prueba"));
        var registro = api.Services.GetRequiredService<ILoggerFactory>().CreateLogger(ComandosSql);

        Assert.False(registro.IsEnabled(LogLevel.Information));
        Assert.True(registro.IsEnabled(LogLevel.Warning));
    }

    [Fact]
    public void LaAplicacionSigueRegistrandoEnInformation()
    {
        using var api = new ApiEnProduccion(("Correo:ClaveDeApi", "clave-de-prueba"));
        var registro = api.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Decorazon.Api");

        Assert.True(registro.IsEnabled(LogLevel.Information));
    }
}
