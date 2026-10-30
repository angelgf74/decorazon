using Decorazon.Aplicacion.Salud;
using Decorazon.Contratos.Salud;

namespace Decorazon.Api.Endpoints;

public static class EndpointsDeSalud
{
    public static IEndpointRouteBuilder MapSalud(this IEndpointRouteBuilder rutas)
    {
        rutas.MapGet("/salud", ConsultarAsync)
            .WithName("consultarSalud")
            .Produces<RespuestaDeSalud>()
            .Produces<RespuestaDeSalud>(StatusCodes.Status503ServiceUnavailable);

        // HEAD también: los monitores externos suelen preguntar con HEAD, y con solo
        // GET recibían un 405 y daban la API por caída estando bien. Fuera del
        // documento OpenAPI: es la misma operación sin cuerpo, y describirla aparte
        // repetiría el operationId "consultarSalud", que rompe los generadores de clientes.
        rutas.MapMethods("/salud", [HttpMethods.Head], ConsultarAsync)
            .ExcludeFromDescription();

        return rutas;
    }

    private static async Task<IResult> ConsultarAsync(
        HttpRequest peticion,
        ConsultarSalud consulta,
        CancellationToken cancelacion)
    {
        var estado = await consulta.EjecutarAsync(cancelacion);
        var codigo = estado.EsCorrecto ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable;

        // Con HEAD, solo el código. Kestrel suprimiría el cuerpo por su cuenta,
        // pero no todos los servidores lo hacen (el de los tests, no): mejor
        // no escribirlo que depender de quién lo quita.
        if (HttpMethods.IsHead(peticion.Method))
        {
            return Results.StatusCode(codigo);
        }

        var respuesta = new RespuestaDeSalud(
            estado.EsCorrecto ? "correcto" : "degradado",
            estado.BaseDeDatos);

        return Results.Json(respuesta, statusCode: codigo);
    }
}
