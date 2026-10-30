using Decorazon.Contratos;

namespace Decorazon.Api.Endpoints;

/// <summary>
/// Los 400 que da el propio framework (validación de los contratos, JSON mal
/// formado, cuerpo ausente) con el mismo cuerpo que los demás errores de la
/// API: <c>{ "mensaje": "…" }</c>. La web enseña el mensaje sin casos especiales.
/// </summary>
public static class PeticionesNoValidas
{
    public const string MensajePorDefecto = "La petición no es válida.";

    public static IServiceCollection AnadirMensajeEnPeticionesNoValidas(this IServiceCollection servicios) =>
        servicios.AddSingleton<IProblemDetailsService, MensajeEnLugarDeProblemDetails>();

    /// <summary>
    /// JSON mal formado o cuerpo ausente: el enlace del cuerpo responde 400 sin
    /// nada dentro. Se rellena aquí, solo si nadie ha escrito ya el cuerpo.
    /// </summary>
    public static IApplicationBuilder UsarMensajeEnPeticionesNoValidas(this IApplicationBuilder aplicacion) =>
        aplicacion.UseStatusCodePages(contexto =>
            contexto.HttpContext.Response.StatusCode == StatusCodes.Status400BadRequest
                ? contexto.HttpContext.Response.WriteAsJsonAsync(
                    new RespuestaDeMensaje(MensajePorDefecto), contexto.HttpContext.RequestAborted)
                : Task.CompletedTask);

    /// <summary>
    /// La validación de <c>AddValidation</c> escribe su 400 a través de
    /// <see cref="IProblemDetailsService"/>: aquí se cambia por el primer mensaje.
    /// </summary>
    private sealed class MensajeEnLugarDeProblemDetails : IProblemDetailsService
    {
        /// <summary>
        /// Lo que no es un 400 se queda sin cuerpo, solo con su código: lanzar
        /// aquí taparía la excepción original de quien lo llama.
        /// </summary>
        public async ValueTask WriteAsync(ProblemDetailsContext contexto) => await TryWriteAsync(contexto);

        public async ValueTask<bool> TryWriteAsync(ProblemDetailsContext contexto)
        {
            var respuesta = contexto.HttpContext.Response;
            if (respuesta.StatusCode != StatusCodes.Status400BadRequest || respuesta.HasStarted)
            {
                return false;
            }

            var mensaje = (contexto.ProblemDetails as HttpValidationProblemDetails)?.Errors
                .SelectMany(error => error.Value)
                .FirstOrDefault(texto => !string.IsNullOrWhiteSpace(texto))
                ?? MensajePorDefecto;

            await respuesta.WriteAsJsonAsync(new RespuestaDeMensaje(mensaje), contexto.HttpContext.RequestAborted);
            return true;
        }
    }
}
