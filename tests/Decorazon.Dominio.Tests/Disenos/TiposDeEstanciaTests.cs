using Decorazon.Dominio.Disenos;

namespace Decorazon.Dominio.Tests.Disenos;

public class TiposDeEstanciaTests
{
    [Theory]
    [InlineData("dormitorio", TipoDeEstancia.Dormitorio)]
    [InlineData("salon", TipoDeEstancia.Salon)]
    [InlineData("cocina", TipoDeEstancia.Cocina)]
    public void Convierte_en_los_dos_sentidos(string texto, TipoDeEstancia esperado)
    {
        Assert.True(TiposDeEstancia.TryDesdeTexto(texto, out var tipo));
        Assert.Equal(esperado, tipo);
        Assert.Equal(texto, TiposDeEstancia.ATexto(tipo));
    }

    [Theory]
    [InlineData("Salon")]
    [InlineData("baño")]
    [InlineData("")]
    [InlineData(null)]
    public void Rechaza_lo_que_no_es_exacto(string? texto) =>
        Assert.False(TiposDeEstancia.TryDesdeTexto(texto, out _));
}
