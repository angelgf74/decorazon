using System.Text;
using Decorazon.Dominio.Disenos;

namespace Decorazon.Dominio.Tests.Disenos;

public class ContenidoDeDisenoTests
{
    private const string Minimo = """{"formato":1,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}""";

    [Theory]
    [InlineData(null, ResultadoDeContenido.Vacio)]
    [InlineData("", ResultadoDeContenido.Vacio)]
    [InlineData("[]", ResultadoDeContenido.NoEsObjeto)]
    [InlineData("3", ResultadoDeContenido.NoEsObjeto)]
    [InlineData("{", ResultadoDeContenido.NoEsJson)]
    [InlineData("""{"formato":2,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}""", ResultadoDeContenido.FormatoNoAdmitido)]
    [InlineData("""{"formato":"1","estancia":{},"aberturas":[],"estructura":[],"elementos":[]}""", ResultadoDeContenido.FormatoNoAdmitido)]
    [InlineData("""{"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}""", ResultadoDeContenido.FormatoNoAdmitido)]
    [InlineData("""{"formato":1,"estancia":{},"aberturas":[],"estructura":[]}""", ResultadoDeContenido.FaltanPartes)]
    [InlineData("""{"formato":1,"estancia":[],"aberturas":[],"estructura":[],"elementos":[]}""", ResultadoDeContenido.FaltanPartes)]
    public void Validar_clasifica_cada_caso_no_valido(string? json, ResultadoDeContenido esperado)
    {
        var resultado = ContenidoDeDiseno.Validar(json, out var contenido);

        Assert.Equal(esperado, resultado);
        Assert.Null(contenido);
    }

    [Fact]
    public void Validar_acepta_un_documento_minimo()
    {
        var resultado = ContenidoDeDiseno.Validar(Minimo, out var contenido);

        Assert.Equal(ResultadoDeContenido.Valido, resultado);
        Assert.Equal(Minimo, contenido!.Json);
    }

    [Fact]
    public void Validar_acepta_exactamente_el_tamano_maximo()
    {
        var json = Minimo + new string(' ', ContenidoDeDiseno.TamanoMaximoEnBytes - Encoding.UTF8.GetByteCount(Minimo));
        Assert.Equal(ContenidoDeDiseno.TamanoMaximoEnBytes, Encoding.UTF8.GetByteCount(json));

        Assert.Equal(ResultadoDeContenido.Valido, ContenidoDeDiseno.Validar(json, out _));
    }

    [Fact]
    public void Validar_rechaza_un_byte_de_mas()
    {
        var json = Minimo + new string(' ', ContenidoDeDiseno.TamanoMaximoEnBytes + 1 - Encoding.UTF8.GetByteCount(Minimo));

        Assert.Equal(ResultadoDeContenido.Demasiado, ContenidoDeDiseno.Validar(json, out var contenido));
        Assert.Null(contenido);
    }

    [Fact]
    public void Validar_mide_bytes_y_no_caracteres()
    {
        // 600 000 caracteres de 2 bytes: pasan de 1 MiB en bytes aunque no en caracteres.
        var json = "\"" + new string('é', 600_000) + "\"";

        Assert.Equal(ResultadoDeContenido.Demasiado, ContenidoDeDiseno.Validar(json, out _));
    }
}
