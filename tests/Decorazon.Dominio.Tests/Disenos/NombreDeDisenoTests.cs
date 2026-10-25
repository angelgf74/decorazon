using Decorazon.Dominio.Disenos;

namespace Decorazon.Dominio.Tests.Disenos;

public class NombreDeDisenoTests
{
    [Fact]
    public void Recorta_los_espacios()
    {
        Assert.True(NombreDeDiseno.TryCrear("  Salón  ", out var nombre));
        Assert.Equal("Salón", nombre.Valor);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Rechaza_vacio_o_espacios(string? texto) =>
        Assert.False(NombreDeDiseno.TryCrear(texto, out _));

    [Fact]
    public void Acepta_100_y_rechaza_101_caracteres()
    {
        Assert.True(NombreDeDiseno.TryCrear(new string('a', 100), out _));
        Assert.False(NombreDeDiseno.TryCrear(new string('a', 101), out _));
    }
}
