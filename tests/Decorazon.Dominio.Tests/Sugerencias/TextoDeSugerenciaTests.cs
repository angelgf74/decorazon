using Decorazon.Dominio.Sugerencias;

namespace Decorazon.Dominio.Tests.Sugerencias;

public class TextoDeSugerenciaTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\n\t ")]
    public void RechazaUnTextoVacio(string? entrada)
    {
        Assert.False(TextoDeSugerencia.TryCrear(entrada, out _));
    }

    [Fact]
    public void QuitaLosEspaciosDeLosExtremos_YConservaLosSaltosDeLinea()
    {
        Assert.True(TextoDeSugerencia.TryCrear("  Primera línea\r\n\tSegunda  ", out var texto));

        Assert.Equal("Primera línea\r\n\tSegunda", texto.Valor);
    }

    [Fact]
    public void AdmiteHastaLaLongitudMaxima_ContadaTrasRecortar()
    {
        var justo = new string('a', TextoDeSugerencia.LongitudMaxima);

        Assert.True(TextoDeSugerencia.TryCrear($"  {justo}  ", out var texto));
        Assert.Equal(justo, texto.Valor);
    }

    [Fact]
    public void RechazaUnTextoMasLargoQueLaLongitudMaxima()
    {
        Assert.False(TextoDeSugerencia.TryCrear(new string('a', TextoDeSugerencia.LongitudMaxima + 1), out _));
    }

    /// <summary>
    /// El buzón guarda el texto en PostgreSQL, que no admite el carácter nulo: mejor
    /// rechazarlo aquí con un 400 que mandar algo que el buzón no puede guardar.
    /// </summary>
    [Theory]
    [InlineData("Hola\u0000")]
    [InlineData("Hola\u0007")]
    [InlineData("\u001bHola")]
    public void RechazaCaracteresDeControl_SalvoTabuladoresYSaltosDeLinea(string entrada)
    {
        Assert.False(TextoDeSugerencia.TryCrear(entrada, out _));
    }

    /// <summary>
    /// Un sustituto suelto no es texto válido: no se puede pasar a UTF-8 para guardarlo.
    /// Las cadenas se arman aquí y no en <c>InlineData</c>: xUnit serializa esos datos y
    /// cambia el sustituto suelto por U+FFFD, que sí es válido.
    /// </summary>
    [Fact]
    public void RechazaUnSustitutoSuelto()
    {
        Assert.False(TextoDeSugerencia.TryCrear("Hola " + (char)0xD800 + " adiós", out _));
        Assert.False(TextoDeSugerencia.TryCrear(((char)0xDC00).ToString(), out _));
    }

    [Fact]
    public void AdmiteEmojis()
    {
        Assert.True(TextoDeSugerencia.TryCrear("Me encanta 😀", out var texto));

        Assert.Equal("Me encanta 😀", texto.Valor);
    }
}
