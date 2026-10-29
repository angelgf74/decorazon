using System.Security.Claims;
using Decorazon.Aplicacion.Contrasenas;
using Decorazon.Contratos;
using Decorazon.Contratos.Cuentas;
using Decorazon.Infraestructura.Correo;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Decorazon.Api.Endpoints;

public static class ContrasenasEndpoints
{
    /// <summary>
    /// Mensaje del paso 1. Deliberadamente ambiguo: es el mismo tanto si se ha
    /// enviado un enlace como si esa dirección no tiene cuenta.
    /// </summary>
    private const string MensajeDeSolicitudAceptada =
        "Si esa dirección tiene cuenta, te hemos enviado un correo con las instrucciones.";

    /// <summary>Mismo texto para token inexistente, manipulado, caducado o ya usado.</summary>
    private const string MensajeDeEnlaceNoValido =
        "Este enlace no es válido o ha caducado. Pide otro desde el inicio de sesión.";

    private static readonly string MensajeDeLongitud =
        $"La contraseña debe tener entre {PeticionDeConfirmarRegistro.LongitudMinimaDeContrasena} " +
        $"y {PeticionDeConfirmarRegistro.LongitudMaximaDeContrasena} caracteres.";

    public static void MapearEndpointsDeContrasenas(this IEndpointRouteBuilder rutas)
    {
        var grupo = rutas.MapGroup("/cuentas/contrasena").WithTags("Contrasena");

        // Comparte cubo con el alta a propósito: los dos endpoints hacen lo mismo
        // —mandar correo a una dirección que no es la de quien llama—, así que el
        // límite debe contar el total. Con cubos separados, un mismo origen podría
        // duplicar los envíos alternando entre ambos.
        grupo.MapPost("/olvido", SolicitarAsync)
            .RequireRateLimiting(LimitesDePeticiones.Registro);

        grupo.MapPost("/restablecer", RestablecerAsync);

        // Comprobar una contraseña actual es la misma superficie que el inicio de
        // sesión, así que lleva el mismo tipo de límite.
        grupo.MapPost("", CambiarAsync)
            .RequireAuthorization()
            .RequireRateLimiting(LimitesDePeticiones.CambioDeContrasena);
    }

    private static async Task<IResult> SolicitarAsync(
        [FromBody] PeticionDeOlvidoDeContrasena peticion,
        SolicitarRestablecerContrasena casoDeUso,
        IOptions<OpcionesDeCorreo> opcionesDeCorreo,
        CancellationToken cancelacion)
    {
        var baseDeLaWeb = opcionesDeCorreo.Value.BaseDeLaWeb.TrimEnd('/');

        var resultado = await casoDeUso.EjecutarAsync(
            peticion.Correo,
            token => $"{baseDeLaWeb}/contrasena/restablecer?token={Uri.EscapeDataString(token)}",
            cancelacion);

        return resultado switch
        {
            ResultadoDeSolicitudDeContrasena.CorreoInvalido =>
                Results.BadRequest(new RespuestaDeError("Ese correo electrónico no parece válido.")),

            // Aceptada tenga cuenta o no: distinguirlos convertiría esto en un
            // comprobador de qué direcciones están registradas.
            _ => Results.Ok(new RespuestaDeError(MensajeDeSolicitudAceptada))
        };
    }

    private static async Task<IResult> RestablecerAsync(
        [FromBody] PeticionDeRestablecerContrasena peticion,
        RestablecerContrasena casoDeUso,
        CancellationToken cancelacion)
    {
        var resultado = await casoDeUso.EjecutarAsync(peticion.Token, peticion.Contrasena, cancelacion);

        return resultado switch
        {
            ResultadoDeRestablecerContrasena.Restablecida =>
                Results.Ok(new RespuestaDeError("Contraseña cambiada. Ya puedes iniciar sesión con ella.")),

            ResultadoDeRestablecerContrasena.ContrasenaNoValida =>
                Results.BadRequest(new RespuestaDeError(MensajeDeLongitud)),

            _ => Results.BadRequest(new RespuestaDeError(MensajeDeEnlaceNoValido))
        };
    }

    /// <summary>
    /// Cambiar la contraseña sabiendo la actual. Sube la versión de
    /// credenciales, así que también el token de esta petición deja de valer: la
    /// web tiene que volver a iniciar sesión con la nueva.
    /// </summary>
    private static async Task<IResult> CambiarAsync(
        [FromBody] PeticionDeCambioDeContrasena peticion,
        ClaimsPrincipal usuario,
        CambiarContrasena casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        var resultado = await casoDeUso.EjecutarAsync(usuarioId, peticion.Actual, peticion.Nueva, cancelacion);

        return resultado switch
        {
            ResultadoDeCambioDeContrasena.Correcto => Results.NoContent(),

            ResultadoDeCambioDeContrasena.ContrasenaNoValida =>
                Results.BadRequest(new RespuestaDeError("La contraseña nueva no vale. " + MensajeDeLongitud)),

            // 400 y no 401 cuando la sesión vale pero la contraseña que se pide
            // para confirmar no: la web trata todo 401 como "tu sesión ha
            // caducado". Equivocarse al teclear no debe echar a nadie.
            _ => Results.BadRequest(new RespuestaDeError("La contraseña actual no es correcta."))
        };
    }
}
