using Decorazon.Dominio.Sugerencias;

namespace Decorazon.Dominio.Tests.Sugerencias;

public class TiposDeSugerenciaTests
{
    [Theory]
    [InlineData("mejora", TipoDeSugerencia.Mejora)]
    [InlineData("funcionalidad", TipoDeSugerencia.Funcionalidad)]
    [InlineData("error", TipoDeSugerencia.Error)]
    [InlineData("pregunta", TipoDeSugerencia.Pregunta)]
    [InlineData("otra", TipoDeSugerencia.Otra)]
    public void LeeCadaNombreDelContrato(string nombre, TipoDeSugerencia esperado)
    {
        Assert.True(TiposDeSugerencia.TryLeer(nombre, out var tipo));

        Assert.Equal(esperado, tipo);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Mejora")]
    [InlineData("0")]
    [InlineData("7")]
    [InlineData("queja")]
    public void RechazaLoQueNoEsUnNombreDelContrato(string? nombre)
    {
        // Ni el nombre del enumerado ni su número: el contrato son los nombres en minúsculas.
        Assert.False(TiposDeSugerencia.TryLeer(nombre, out _));
    }

    [Fact]
    public void CadaTipoTieneSuNombre_YSeLeeDeVuelta()
    {
        foreach (var tipo in Enum.GetValues<TipoDeSugerencia>())
        {
            Assert.True(TiposDeSugerencia.TryLeer(TiposDeSugerencia.Nombre(tipo), out var leido));
            Assert.Equal(tipo, leido);
        }
    }
}
