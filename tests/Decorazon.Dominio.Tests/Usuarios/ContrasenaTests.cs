using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Tests.Usuarios;

public class ContrasenaTests
{
    [Fact]
    public void Acepta_UnaContrasenaDeLongitudSuficiente()
    {
        var justa = new string('a', Contrasena.LongitudMinima);

        Assert.True(Contrasena.TryCrear(justa, out _));
    }

    [Fact]
    public void Rechaza_UnCaracterMenosDelMinimo()
    {
        var corta = new string('a', Contrasena.LongitudMinima - 1);

        Assert.False(Contrasena.TryCrear(corta, out _));
    }

    [Fact]
    public void Rechaza_LasQueSuperanElMaximo()
    {
        var larga = new string('a', Contrasena.LongitudMaxima + 1);

        Assert.False(Contrasena.TryCrear(larga, out _));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void Rechaza_VaciaONula(string? entrada)
    {
        Assert.False(Contrasena.TryCrear(entrada, out _));
    }

    [Fact]
    public void NoRevelaSuValor_AlConvertirseATexto()
    {
        Assert.True(Contrasena.TryCrear("una-contrasena-larga", out var contrasena));

        // Protege del volcado accidental en un log.
        Assert.DoesNotContain("contrasena-larga", contrasena.ToString());
    }
}
