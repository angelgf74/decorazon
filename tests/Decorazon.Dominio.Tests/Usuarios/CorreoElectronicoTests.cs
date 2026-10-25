using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Tests.Usuarios;

public class CorreoElectronicoTests
{
    [Theory]
    [InlineData("alguien@ejemplo.com")]
    [InlineData("nombre.apellido@sub.dominio.es")]
    [InlineData("con+etiqueta@ejemplo.com")]
    public void Acepta_CorreosValidos(string entrada)
    {
        Assert.True(CorreoElectronico.TryCrear(entrada, out _));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("sin-arroba.com")]
    [InlineData("sin@dominio")]
    [InlineData("dos@@arrobas.com")]
    [InlineData("con espacio@ejemplo.com")]
    public void Rechaza_CorreosInvalidos(string? entrada)
    {
        Assert.False(CorreoElectronico.TryCrear(entrada, out _));
    }

    [Fact]
    public void Normaliza_AMinusculasYSinEspaciosAlrededor()
    {
        Assert.True(CorreoElectronico.TryCrear("  Alguien@Ejemplo.COM  ", out var correo));

        Assert.Equal("alguien@ejemplo.com", correo.Valor);
    }

    [Fact]
    public void DosCorreosQueSoloDifierenEnMayusculas_SonIguales()
    {
        var uno = CorreoElectronico.Crear("alguien@ejemplo.com");
        var otro = CorreoElectronico.Crear("ALGUIEN@EJEMPLO.COM");

        // De esto depende que la unicidad de cuentas funcione.
        Assert.Equal(uno, otro);
        Assert.Equal(uno.GetHashCode(), otro.GetHashCode());
    }

    [Fact]
    public void Rechaza_CorreosDemasiadoLargos()
    {
        var demasiadoLargo = new string('a', CorreoElectronico.LongitudMaxima) + "@ejemplo.com";

        Assert.False(CorreoElectronico.TryCrear(demasiadoLargo, out _));
    }
}
