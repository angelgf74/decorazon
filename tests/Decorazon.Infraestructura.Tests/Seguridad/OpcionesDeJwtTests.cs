using Decorazon.Infraestructura.Seguridad;

namespace Decorazon.Infraestructura.Tests.Seguridad;

/// <summary>
/// Arrancar con la clave de ejemplo, o sin ninguna, invalidaría toda la
/// seguridad: cualquiera podría firmar sus propios tokens.
/// </summary>
public class OpcionesDeJwtTests
{
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void SinClave_NoArranca(string clave)
    {
        var opciones = new OpcionesDeJwt { ClaveDeFirma = clave };

        Assert.Throws<InvalidOperationException>(opciones.Validar);
    }

    [Fact]
    public void ConClaveCorta_NoArranca()
    {
        var opciones = new OpcionesDeJwt { ClaveDeFirma = new string('x', OpcionesDeJwt.LongitudMinimaDeClave - 1) };

        Assert.Throws<InvalidOperationException>(opciones.Validar);
    }

    [Fact]
    public void ConClaveSuficiente_Arranca()
    {
        var opciones = new OpcionesDeJwt { ClaveDeFirma = new string('x', OpcionesDeJwt.LongitudMinimaDeClave) };

        opciones.Validar();
    }
}
