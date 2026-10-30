using System.Security.Claims;
using Decorazon.Aplicacion.Cuentas;
using Decorazon.Contratos;
using Decorazon.Contratos.Cuentas;
using Microsoft.AspNetCore.Mvc;

namespace Decorazon.Api.Endpoints;

/// <summary>La cuenta de la sesión: quién soy y darme de baja.</summary>
public static class CuentasEndpoints
{
    public static void MapearEndpointsDeCuentas(this IEndpointRouteBuilder rutas)
    {
        var grupo = rutas.MapGroup("/cuentas/yo")
            .RequireAuthorization()
            .WithTags("Cuentas");

        grupo.MapGet("", MiCuentaAsync)
            .WithName("obtenerMiCuenta")
            .Produces<RespuestaDeMiCuenta>()
            .Produces(StatusCodes.Status401Unauthorized);

        // Borrar la cuenta comprueba la contraseña: misma superficie que cambiarla,
        // y mismo cubo.
        grupo.MapDelete("", BorrarmeAsync)
            .RequireRateLimiting(LimitesDePeticiones.CambioDeContrasena)
            .WithName("borrarMiCuenta")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized);
    }

    private static async Task<IResult> MiCuentaAsync(
        ClaimsPrincipal usuario,
        ConsultarMiCuenta casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        var datos = await casoDeUso.EjecutarAsync(usuarioId, cancelacion);

        return datos is null
            ? Results.Unauthorized()
            : Results.Ok(new RespuestaDeMiCuenta(datos.Nombre, datos.Correo));
    }

    private static async Task<IResult> BorrarmeAsync(
        [FromBody] PeticionDeBaja peticion,
        ClaimsPrincipal usuario,
        BorrarCuenta casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        var resultado = await casoDeUso.EjecutarAsync(usuarioId, peticion.Contrasena, cancelacion);

        // 400 y no 401 con la contraseña equivocada: la sesión vale, y un 401
        // haría que la web la cerrara.
        return resultado == ResultadoDeBaja.Correcto
            ? Results.NoContent()
            : Results.BadRequest(new RespuestaDeMensaje("La contraseña no es correcta."));
    }
}
