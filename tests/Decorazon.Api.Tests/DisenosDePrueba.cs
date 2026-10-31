using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Decorazon.Contratos.Disenos;

namespace Decorazon.Api.Tests;

/// <summary>Contenidos y atajos para los tests que necesitan diseños.</summary>
public static class DisenosDePrueba
{
    /// <summary>El envoltorio mínimo que la API admite.</summary>
    public const string ContenidoMinimo =
        """{"formato":1,"estancia":{"ancho":300,"largo":400},"aberturas":[],"estructura":[],"elementos":[]}""";

    public static JsonElement Contenido(string json = ContenidoMinimo) => JsonDocument.Parse(json).RootElement.Clone();

    public static PeticionDeDiseno Peticion(
        string nombre = "Mi dormitorio", string tipo = "dormitorio", string json = ContenidoMinimo, Guid? id = null) =>
        new() { Id = id, Nombre = nombre, TipoEstancia = tipo, Contenido = Contenido(json) };

    /// <summary>Crea un diseño y devuelve su id; falla el test si no responde 201.</summary>
    public static async Task<Guid> CrearAsync(HttpClient cliente, string nombre = "Mi dormitorio")
    {
        var respuesta = await cliente.PostAsJsonAsync("/disenos", Peticion(nombre));
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);

        return (await respuesta.Content.ReadFromJsonAsync<RespuestaDeDiseno>())!.Id;
    }

    /// <summary>
    /// Un cuerpo escrito a mano, para mandar lo que un serializador nunca
    /// produciría (escapes sueltos, tipos equivocados…).
    /// </summary>
    public static StringContent CuerpoCrudo(string json) => new(json, Encoding.UTF8, "application/json");

    /// <summary>Contenido válido relleno hasta pesar unos <paramref name="bytes"/> en UTF-8.</summary>
    public static string ContenidoDeTamano(int bytes)
    {
        const string Prefijo = "{\"formato\":1,\"estancia\":{\"notas\":\"";
        const string Sufijo = "\"},\"aberturas\":[],\"estructura\":[],\"elementos\":[]}";
        var relleno = bytes - Encoding.UTF8.GetByteCount(Prefijo) - Encoding.UTF8.GetByteCount(Sufijo);

        return Prefijo + new string('x', relleno) + Sufijo;
    }
}
