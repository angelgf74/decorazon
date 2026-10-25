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

    [Theory]
    [InlineData("\uFEFF{\"formato\":1,\"estancia\":{},\"aberturas\":[],\"estructura\":[],\"elementos\":[]}")]
    [InlineData("{\"formato\":1,\"estancia\":{},\"aberturas\":[],\"estructura\":[],\"elementos\":[]} basura")]
    public void Validar_no_lanza_con_entradas_hostiles_de_texto(string json)
    {

        Assert.Equal(ResultadoDeContenido.NoEsJson.ToString(), Resultado(json));
    }

    [Fact]
    public void Validar_rechaza_un_sustituto_suelto_en_un_valor()
    {
        var json = "{\"formato\":1,\"estancia\":{},\"aberturas\":[],\"estructura\":[],\"elementos\":[],\"x\":\"" + '\uD800' + "\"}";

        Assert.Equal(ResultadoDeContenido.NoEsJson, ContenidoDeDiseno.Validar(json, out var contenido));
        Assert.Null(contenido);
    }

    [Theory]
    [InlineData("""{"formato":1,"estancia":{"nota":"\uD800"},"aberturas":[],"estructura":[],"elementos":[]}""")]
    [InlineData("""{"formato":1,"estancia":{"\uDC00":1},"aberturas":[],"estructura":[],"elementos":[]}""")]
    [InlineData("""{"formato":1,"estancia":{},"aberturas":[],"estructura":[],"elementos":[["\uD83D x"]]}""")]
    public void Validar_rechaza_un_escape_de_sustituto_suelto_en_valores_y_nombres(string json)
    {
        // Es texto JSON bien formado, pero jsonb de PostgreSQL no admite ese escape:
        // hay que pararlo aquí, o el guardado fallaría con un error de base de datos.
        Assert.Equal(ResultadoDeContenido.NoEsJson, ContenidoDeDiseno.Validar(json, out var contenido));
        Assert.Null(contenido);
    }

    [Fact]
    public void Validar_admite_un_par_de_sustitutos_escrito_como_escape()
    {
        var json = """{"formato":1,"estancia":{"nota":"\uD83D\uDE00"},"aberturas":[],"estructura":[],"elementos":[]}""";

        Assert.Equal(ResultadoDeContenido.Valido, ContenidoDeDiseno.Validar(json, out _));
    }

    [Fact]
    public void Validar_rechaza_anidamiento_de_mas_de_64_niveles()
    {
        var json = new string('[', 100) + new string(']', 100);

        Assert.Equal(ResultadoDeContenido.NoEsJson, ContenidoDeDiseno.Validar(json, out _));
    }

    [Theory]
    [InlineData("1e400")]
    [InlineData("1.0")]
    public void Validar_exige_un_formato_entero(string formato)
    {
        var json = "{\"formato\":" + formato + ",\"estancia\":{},\"aberturas\":[],\"estructura\":[],\"elementos\":[]}";

        Assert.Equal(ResultadoDeContenido.FormatoNoAdmitido, ContenidoDeDiseno.Validar(json, out _));
    }

    private static string Resultado(string json) => ContenidoDeDiseno.Validar(json, out _).ToString();
}
