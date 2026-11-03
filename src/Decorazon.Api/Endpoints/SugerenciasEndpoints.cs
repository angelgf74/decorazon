using System.Security.Claims;
using Decorazon.Aplicacion.Sugerencias;
using Decorazon.Contratos;
using Decorazon.Contratos.Sugerencias;
using Microsoft.AspNetCore.Mvc;

namespace Decorazon.Api.Endpoints;

/// <summary>Sugerencias para el autor, con sesión o sin ella.</summary>
public static class SugerenciasEndpoints
{
    public static void MapearEndpointsDeSugerencias(this IEndpointRouteBuilder rutas)
    {
        // Sin RequireAuthorization: el editor se usa sin cuenta y también se puede opinar sin ella.
        // Con un token válido, la identidad sale de él.
        rutas.MapPost("/sugerencias", EnviarAsync)
            .WithTags("Sugerencias")
            .RequireRateLimiting(LimitesDePeticiones.Sugerencias)
            .WithName("enviarSugerencia")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status429TooManyRequests)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status502BadGateway);
    }

    private static async Task<IResult> EnviarAsync(
        [FromBody] PeticionDeSugerencia peticion,
        HttpContext contexto,
        ClaimsPrincipal usuario,
        EnviarSugerencia casoDeUso,
        CancellationToken cancelacion)
    {
        // Un token que no vale (sesión cerrada en otro dispositivo, caducada) no es "sin sesión":
        // el 401 hace que la web cierre la suya, en vez de pedir un correo sin saber por qué.
        var conSesion = usuario.TryObtenerId(out var usuarioId);
        if (!conSesion && contexto.Request.Headers.Authorization.Count > 0)
        {
            return Results.Unauthorized();
        }

        var resultado = await casoDeUso.EjecutarAsync(
            conSesion ? usuarioId : null,
            peticion.Correo,
            peticion.Texto,
            peticion.Tipo,
            cancelacion);

        return resultado switch
        {
            ResultadoDeSugerencia.Enviada => Results.NoContent(),
            ResultadoDeSugerencia.SesionCerrada => Results.Unauthorized(),
            ResultadoDeSugerencia.TextoNoValido => Mensaje(
                "Escribe tu sugerencia con texto normal, de 2000 caracteres como mucho."),
            ResultadoDeSugerencia.TipoNoValido => Mensaje("Elige de qué va tu sugerencia."),
            ResultadoDeSugerencia.CorreoNoValido => Mensaje("Indica un correo válido para poder responderte."),
            ResultadoDeSugerencia.CorreoDemasiadoLargo => Mensaje(
                "El buzón de sugerencias solo admite correos de 200 caracteres como mucho."),
            ResultadoDeSugerencia.NoSePudoEnviar => Results.Json(
                new RespuestaDeMensaje("No se ha podido enviar la sugerencia. Inténtalo dentro de un rato."),
                statusCode: StatusCodes.Status502BadGateway),
            _ => throw new InvalidOperationException($"Resultado sin respuesta: {resultado}.")
        };
    }

    private static IResult Mensaje(string texto) => Results.BadRequest(new RespuestaDeMensaje(texto));
}
