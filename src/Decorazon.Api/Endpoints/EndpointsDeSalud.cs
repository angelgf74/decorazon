using Decorazon.Aplicacion.Salud;
using Decorazon.Contratos.Salud;

namespace Decorazon.Api.Endpoints;

public static class EndpointsDeSalud
{
    public static IEndpointRouteBuilder MapSalud(this IEndpointRouteBuilder rutas)
    {
        // GET y HEAD: los monitores externos suelen preguntar con HEAD, y con
        // solo GET recibían un 405 y daban la API por caída estando bien.
        rutas.MapMethods("/salud", [HttpMethods.Get, HttpMethods.Head], async (
            HttpRequest peticion,
            ConsultarSalud consulta,
            CancellationToken cancelacion) =>
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
        })
        .WithName("Salud");

        return rutas;
    }
}
