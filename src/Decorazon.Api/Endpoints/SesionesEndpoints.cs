using Decorazon.Aplicacion.Sesiones;
using Decorazon.Contratos;
using Decorazon.Contratos.Cuentas;
using Microsoft.AspNetCore.Mvc;

namespace Decorazon.Api.Endpoints;

public static class SesionesEndpoints
{
    /// <summary>
    /// Un único mensaje para "ese correo no existe" y "la contraseña es incorrecta".
    /// Distinguirlos revelaría qué direcciones tienen cuenta.
    /// </summary>
    private const string MensajeDeCredencialesIncorrectas = "Correo o contraseña incorrectos.";

    public static void MapearEndpointsDeSesiones(this IEndpointRouteBuilder rutas)
    {
        rutas.MapPost("/sesiones", IniciarAsync)
            .RequireRateLimiting(LimitesDePeticiones.InicioDeSesion)
            .WithTags("Sesiones");
    }

    private static async Task<IResult> IniciarAsync(
        [FromBody] PeticionDeInicioDeSesion peticion,
        IniciarSesion casoDeUso,
        CancellationToken cancelacion)
    {
        var acceso = await casoDeUso.EjecutarAsync(peticion.Correo, peticion.Contrasena, cancelacion);

        if (acceso is null)
        {
            return Results.Json(
                new RespuestaDeError(MensajeDeCredencialesIncorrectas),
                statusCode: StatusCodes.Status401Unauthorized);
        }

        return Results.Ok(new RespuestaDeInicioDeSesion(acceso.Token, acceso.Caducidad));
    }
}
