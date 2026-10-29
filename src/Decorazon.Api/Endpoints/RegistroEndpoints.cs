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

    public static void MapearEndpointsDeRegistro(this IEndpointRouteBuilder rutas)
    {
        var grupo = rutas.MapGroup("/cuentas/registro").WithTags("Registro");

        grupo.MapPost("", SolicitarAsync)
            .RequireRateLimiting(LimitesDePeticiones.Registro);

        grupo.MapPost("/confirmar", ConfirmarAsync);
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
                Results.BadRequest(new RespuestaDeError("Ese correo electrónico no parece válido.")),

            // El diseño se valida antes de mirar nada del correo: este 400 no
            // dice si la dirección tiene cuenta.
            ResultadoDeSolicitud.DisenoNoValido =>
                Results.BadRequest(new RespuestaDeError(
                    "El diseño que querías guardar no es válido. Revísalo o pide el alta sin él.")),

            // Tres por correo y hora, tenga cuenta o no: tampoco delata nada.
            ResultadoDeSolicitud.DemasiadasSolicitudes =>
                Results.Json(
                    new RespuestaDeError("Has pedido el alta demasiadas veces. Espera un rato antes de volver a intentarlo."),
                    statusCode: StatusCodes.Status429TooManyRequests),

            // Aceptada tanto si se ha creado la solicitud como si el correo ya
            // tenía cuenta: distinguirlos convertiría esto en un comprobador de
            // qué direcciones están registradas.
            _ => Results.Ok(new RespuestaDeError(MensajeDeSolicitudAceptada))
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
                Results.Ok(new RespuestaDeError("Cuenta creada. Ya puedes iniciar sesión.")),

            ResultadoDeCompletarRegistro.NombreNoValido =>
                Results.BadRequest(new RespuestaDeError(
                    $"Indica tu nombre, de {PeticionDeConfirmarRegistro.LongitudMaximaDeNombre} caracteres como mucho.")),

            ResultadoDeCompletarRegistro.ContrasenaNoValida =>
                Results.BadRequest(new RespuestaDeError(
                    $"La contraseña debe tener entre {PeticionDeConfirmarRegistro.LongitudMinimaDeContrasena} " +
                    $"y {PeticionDeConfirmarRegistro.LongitudMaximaDeContrasena} caracteres.")),

            _ => Results.BadRequest(new RespuestaDeError(MensajeDeEnlaceNoValido))
        };
    }
}
