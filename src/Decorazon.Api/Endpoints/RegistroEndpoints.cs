using Decorazon.Aplicacion.Registro;
using Decorazon.Contratos;
using Decorazon.Contratos.Cuentas;
using Decorazon.Infraestructura.Correo;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Decorazon.Api.Endpoints;

public static class RegistroEndpoints
{
    /// <summary>
    /// Mensaje del paso 1. Deliberadamente ambiguo: es el mismo tanto si se ha
    /// creado una solicitud como si el correo ya tenía cuenta.
    /// </summary>
    private const string MensajeDeSolicitudAceptada =
        "Si esa dirección es válida, te hemos enviado un correo con las instrucciones.";

    /// <summary>Mismo texto para token inexistente, manipulado, caducado o ya usado.</summary>
    private const string MensajeDeEnlaceNoValido =
        "Este enlace no es válido o ha caducado. Pide el alta de nuevo.";

    /// <summary>
    /// 503 cuando el proveedor de correo no acepta el mensaje: el fallo es pasajero y
    /// ajeno a quien llama. Lo comparten el alta y el olvido de contraseña.
    /// </summary>
    internal static IResult CorreoNoEnviado() =>
        Results.Json(
            new RespuestaDeMensaje("No hemos podido enviar el correo. Inténtalo dentro de un rato."),
            statusCode: StatusCodes.Status503ServiceUnavailable);

    public static void MapearEndpointsDeRegistro(this IEndpointRouteBuilder rutas)
    {
        var grupo = rutas.MapGroup("/cuentas/registro").WithTags("Registro");

        grupo.MapPost("", SolicitarAsync)
            .RequireRateLimiting(LimitesDePeticiones.Registro)
            .WithName("solicitarRegistro")
            .Produces<RespuestaDeMensaje>()
            .Produces<RespuestaDeMensaje>(StatusCodes.Status400BadRequest)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status429TooManyRequests)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status503ServiceUnavailable);

        grupo.MapPost("/confirmar", ConfirmarAsync)
            .WithName("confirmarRegistro")
            .Produces<RespuestaDeMensaje>()
            .Produces<RespuestaDeMensaje>(StatusCodes.Status400BadRequest);
    }

    private static async Task<IResult> SolicitarAsync(
        [FromBody] PeticionDeRegistro peticion,
        SolicitarRegistro casoDeUso,
        IOptions<OpcionesDeCorreo> opcionesDeCorreo,
        CancellationToken cancelacion)
    {
        var baseDeLaWeb = opcionesDeCorreo.Value.BaseDeLaWeb.TrimEnd('/');

        var resultado = await casoDeUso.EjecutarAsync(
            peticion.Correo,
            peticion.Diseno is null ? null : DisenosEndpoints.ACasoDeUso(peticion.Diseno),
            token => $"{baseDeLaWeb}/registro/confirmar?token={Uri.EscapeDataString(token)}",
            cancelacion);

        return resultado switch
        {
            ResultadoDeSolicitud.CorreoInvalido =>
                Results.BadRequest(new RespuestaDeMensaje("Ese correo electrónico no parece válido.")),

            // El diseño se valida antes de mirar nada del correo: este 400 no
            // dice si la dirección tiene cuenta.
            ResultadoDeSolicitud.DisenoNoValido =>
                Results.BadRequest(new RespuestaDeMensaje(
                    "El diseño que querías guardar no es válido. Revísalo o pide el alta sin él.")),

            // Tres por correo y hora, tenga cuenta o no: tampoco delata nada.
            ResultadoDeSolicitud.DemasiadasSolicitudes =>
                Results.Json(
                    new RespuestaDeMensaje("Has pedido el alta demasiadas veces. Espera un rato antes de volver a intentarlo."),
                    statusCode: StatusCodes.Status429TooManyRequests),

            ResultadoDeSolicitud.CorreoNoEnviado => CorreoNoEnviado(),

            // Aceptada tanto si se ha creado la solicitud como si el correo ya
            // tenía cuenta: distinguirlos convertiría esto en un comprobador de
            // qué direcciones están registradas.
            _ => Results.Ok(new RespuestaDeMensaje(MensajeDeSolicitudAceptada))
        };
    }

    private static async Task<IResult> ConfirmarAsync(
        [FromBody] PeticionDeConfirmarRegistro peticion,
        CompletarRegistro casoDeUso,
        CancellationToken cancelacion)
    {
        var resultado = await casoDeUso.EjecutarAsync(
            peticion.Token, peticion.Nombre, peticion.Contrasena, cancelacion);

        return resultado switch
        {
            ResultadoDeCompletarRegistro.Completado =>
                Results.Ok(new RespuestaDeMensaje("Cuenta creada. Ya puedes iniciar sesión.")),

            ResultadoDeCompletarRegistro.NombreNoValido =>
                Results.BadRequest(new RespuestaDeMensaje(
                    $"Indica tu nombre, de {PeticionDeConfirmarRegistro.LongitudMaximaDeNombre} caracteres como mucho.")),

            ResultadoDeCompletarRegistro.ContrasenaNoValida =>
                Results.BadRequest(new RespuestaDeMensaje(
                    $"La contraseña debe tener entre {PeticionDeConfirmarRegistro.LongitudMinimaDeContrasena} " +
                    $"y {PeticionDeConfirmarRegistro.LongitudMaximaDeContrasena} caracteres.")),

            _ => Results.BadRequest(new RespuestaDeMensaje(MensajeDeEnlaceNoValido))
        };
    }
}
