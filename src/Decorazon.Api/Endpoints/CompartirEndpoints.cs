using System.Security.Claims;
using System.Text.Json;
using Decorazon.Aplicacion.Disenos;
using Decorazon.Contratos;
using Decorazon.Contratos.Disenos;
using Decorazon.Dominio.Disenos;

namespace Decorazon.Api.Endpoints;

/// <summary>
/// Compartir un diseño con un enlace. El dueño lo crea y lo retira con sesión
/// (un diseño ajeno responde <c>404</c>, como en <see cref="DisenosEndpoints"/>);
/// quien tiene el enlace lee la última versión guardada sin sesión.
/// </summary>
public static class CompartirEndpoints
{
    private const string MensajeDeEnlaceQueNoFunciona = "Este enlace ya no funciona.";

    public static void MapearEndpointsDeCompartir(this IEndpointRouteBuilder rutas)
    {
        var dueno = rutas.MapGroup("/disenos")
            .RequireAuthorization()
            .WithTags("Disenos");

        dueno.MapPut("/{id:guid}/enlace", CompartirAsync)
            .WithName("compartirDiseno")
            .Produces<RespuestaDeEnlace>()
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound);

        dueno.MapDelete("/{id:guid}/enlace", DejarDeCompartirAsync)
            .WithName("dejarDeCompartirDiseno")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound);

        rutas.MapGet("/compartidos/{enlace}", LeerAsync)
            .WithTags("Compartidos")
            .WithName("leerDisenoCompartido")
            .RequireRateLimiting(LimitesDePeticiones.LecturaCompartida)
            .Produces<RespuestaDeDisenoCompartido>()
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status429TooManyRequests);
    }

    private static async Task<IResult> CompartirAsync(
        Guid id,
        ClaimsPrincipal usuario,
        CompartirDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        var enlace = await casoDeUso.CompartirAsync(usuarioId, id, cancelacion);

        return enlace is null ? NoEncontrado() : Results.Ok(new RespuestaDeEnlace(enlace));
    }

    private static async Task<IResult> DejarDeCompartirAsync(
        Guid id,
        ClaimsPrincipal usuario,
        CompartirDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        return await casoDeUso.DejarDeCompartirAsync(usuarioId, id, cancelacion)
            ? Results.NoContent()
            : NoEncontrado();
    }

    /// <summary>
    /// Un enlace que nunca existió y uno retirado responden igual: no se da pista
    /// de cuál fue. <c>no-store</c>: lo que se ve debe ser siempre lo último guardado,
    /// y retirar el enlace no puede dejar copias en ningún almacén intermedio.
    /// </summary>
    private static async Task<IResult> LeerAsync(
        string enlace,
        HttpResponse respuesta,
        CompartirDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        respuesta.Headers.CacheControl = "no-store";

        var diseno = await casoDeUso.ObtenerCompartidoAsync(enlace, cancelacion);
        if (diseno is null)
        {
            return Results.NotFound(new RespuestaDeMensaje(MensajeDeEnlaceQueNoFunciona));
        }

        using var documento = JsonDocument.Parse(diseno.Contenido.Json);

        return Results.Ok(new RespuestaDeDisenoCompartido(
            diseno.Nombre.Valor,
            TiposDeEstancia.ATexto(diseno.Tipo),
            diseno.FechaDeModificacion,
            documento.RootElement.Clone()));
    }

    private static IResult NoEncontrado() =>
        Results.NotFound(new RespuestaDeMensaje(TextosDeEstado.DeRechazo(EstadoDeDiseno.NoEncontrado)));
}
