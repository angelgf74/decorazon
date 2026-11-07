using System.Security.Claims;
using System.Text.Json;
using Decorazon.Aplicacion.Disenos;
using Decorazon.Contratos;
using Decorazon.Contratos.Disenos;
using Decorazon.Dominio.Disenos;
using Decorazon.Infraestructura.Correo;
using Microsoft.Extensions.Options;

namespace Decorazon.Api.Endpoints;

/// <summary>
/// Compartir un diseño con un enlace. El dueño lo crea y lo retira con sesión
/// (un diseño ajeno responde <c>404</c>, como en <see cref="DisenosEndpoints"/>);
/// quien tiene el enlace lee la última versión guardada sin sesión.
/// </summary>
public static class CompartirEndpoints
{
    private const string MensajeDeEnlaceQueNoFunciona = "Este enlace ya no funciona.";

    private const string MensajeDeVistaPreviaNoValida = "La vista previa debe ser una imagen JPEG de 300 KB como mucho.";

    /// <summary>El icono de la web, para la tarjeta sin vista previa.</summary>
    private const string RutaDelIcono = "/iconos/icono-512.png";

    public static void MapearEndpointsDeCompartir(this IEndpointRouteBuilder rutas)
    {
        var dueno = rutas.MapGroup("/disenos")
            .RequireAuthorization()
            .WithTags("Disenos");

        dueno.MapPut("/{id:guid}/enlace", CompartirAsync)
            .WithName("compartirDiseno")
            .RequireRateLimiting(LimitesDePeticiones.Escrituras)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status429TooManyRequests)
            .Produces<RespuestaDeEnlace>()
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound);

        dueno.MapDelete("/{id:guid}/enlace", DejarDeCompartirAsync)
            .WithName("dejarDeCompartirDiseno")
            .RequireRateLimiting(LimitesDePeticiones.Escrituras)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status429TooManyRequests)
            .Produces(StatusCodes.Status204NoContent)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound);

        dueno.MapGet("/{id:guid}/vista-previa", LeerVistaPreviaDelDuenoAsync)
            .WithName("leerVistaPreviaDelDueno")
            .RequireRateLimiting(LimitesDePeticiones.Tarjetas)
            .Produces(StatusCodes.Status200OK, contentType: "image/jpeg")
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status429TooManyRequests);

        dueno.MapPut("/{id:guid}/vista-previa", SubirVistaPreviaAsync)
            .WithName("subirVistaPrevia")
            .RequireRateLimiting(LimitesDePeticiones.Escrituras)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status429TooManyRequests)
            .Accepts<byte[]>("image/jpeg")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status400BadRequest)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status415UnsupportedMediaType);

        rutas.MapGet("/compartidos/{enlace}/imagen", LeerVistaPreviaAsync)
            .WithTags("Compartidos")
            .WithName("leerVistaPrevia")
            .RequireRateLimiting(LimitesDePeticiones.Tarjetas)
            .Produces(StatusCodes.Status200OK, contentType: "image/jpeg")
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status429TooManyRequests);

        rutas.MapGet("/compartidos/{enlace}/tarjeta", LeerTarjetaAsync)
            .WithTags("Compartidos")
            .WithName("leerTarjeta")
            .RequireRateLimiting(LimitesDePeticiones.Tarjetas)
            .Produces(StatusCodes.Status200OK, contentType: "text/html")
            .Produces(StatusCodes.Status404NotFound, contentType: "text/html")
            .Produces<RespuestaDeMensaje>(StatusCodes.Status429TooManyRequests);

        // Algunos lectores de tarjetas preguntan antes con HEAD. Fuera del documento: es la misma operación.
        rutas.MapMethods("/compartidos/{enlace}/imagen", [HttpMethods.Head], LeerVistaPreviaAsync)
            .RequireRateLimiting(LimitesDePeticiones.Tarjetas)
            .ExcludeFromDescription();
        rutas.MapMethods("/compartidos/{enlace}/tarjeta", [HttpMethods.Head], LeerTarjetaAsync)
            .RequireRateLimiting(LimitesDePeticiones.Tarjetas)
            .ExcludeFromDescription();

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

    /// <summary>
    /// El cuerpo es la imagen tal cual (<c>image/jpeg</c>), no JSON: se lee a mano y se corta en cuanto pasa del máximo,
    /// sin cargar en memoria más de lo admitido.
    /// </summary>
    private static async Task<IResult> SubirVistaPreviaAsync(
        Guid id,
        HttpRequest peticion,
        ClaimsPrincipal usuario,
        CompartirDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        var noValida = Results.BadRequest(new RespuestaDeMensaje(MensajeDeVistaPreviaNoValida));
        var tipo = peticion.ContentType?.Split(';')[0].Trim();
        if (!string.Equals(tipo, "image/jpeg", StringComparison.OrdinalIgnoreCase) || peticion.ContentLength > VistaPrevia.TamanoMaximoEnBytes)
        {
            return noValida;
        }

        using var imagen = new MemoryStream();
        var trozo = new byte[16 * 1024];
        int leidos;
        while ((leidos = await peticion.Body.ReadAsync(trozo, cancelacion)) > 0)
        {
            imagen.Write(trozo, 0, leidos);
            if (imagen.Length > VistaPrevia.TamanoMaximoEnBytes)
            {
                return noValida;
            }
        }

        return await casoDeUso.GuardarVistaPreviaAsync(usuarioId, id, imagen.ToArray(), cancelacion) switch
        {
            ResultadoDeVistaPrevia.Guardada => Results.NoContent(),
            ResultadoDeVistaPrevia.NoValida => noValida,
            _ => NoEncontrado()
        };
    }

    /// <summary>
    /// La miniatura de «Mis diseños»: la vista previa de un diseño propio, se comparta o no. Privada (va con sesión) y
    /// sin guardar en ninguna caché: la dirección es la misma cuando la imagen se rehace (la web pide por id y guarda
    /// la respuesta en memoria por fecha del listado), y una imagen privada no debe quedar en el disco de un ordenador compartido.
    /// </summary>
    private static async Task<IResult> LeerVistaPreviaDelDuenoAsync(
        Guid id,
        ClaimsPrincipal usuario,
        HttpResponse respuesta,
        CompartirDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        respuesta.Headers.XContentTypeOptions = "nosniff";
        var vista = await casoDeUso.ObtenerVistaPreviaDelDuenoAsync(usuarioId, id, cancelacion);
        if (vista is null)
        {
            respuesta.Headers.CacheControl = "no-store";
            return NoEncontrado();
        }

        respuesta.Headers.CacheControl = "private, no-store";
        return Results.File(vista.Imagen, "image/jpeg");
    }

    /// <summary>
    /// Pública mientras el diseño se comparta. Se puede guardar unos minutos: su dirección en la tarjeta lleva la
    /// fecha, así que una imagen nueva se pide con otra dirección.
    /// </summary>
    private static async Task<IResult> LeerVistaPreviaAsync(
        string enlace,
        HttpResponse respuesta,
        CompartirDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        // Lo que suba cada cuenta se sirve como imagen: que el navegador no lo interprete como otra cosa.
        respuesta.Headers.XContentTypeOptions = "nosniff";
        var vista = await casoDeUso.ObtenerVistaPreviaAsync(enlace, cancelacion);
        if (vista is null)
        {
            respuesta.Headers.CacheControl = "no-store";
            return Results.NotFound(new RespuestaDeMensaje(MensajeDeEnlaceQueNoFunciona));
        }

        respuesta.Headers.CacheControl = "public, max-age=300";
        return Results.File(vista.Imagen, "image/jpeg");
    }

    /// <summary>
    /// La tarjeta que leen WhatsApp y compañía (nginx les manda aquí las visitas a /compartido/&lt;enlace&gt; de la
    /// web). La dirección de la imagen sale del host de la petición: nginx la reenvía con el de la API.
    /// </summary>
    private static async Task<IResult> LeerTarjetaAsync(
        string enlace,
        HttpRequest peticion,
        HttpResponse respuesta,
        CompartirDisenos casoDeUso,
        IOptions<OpcionesDeCorreo> opcionesDeCorreo,
        CancellationToken cancelacion)
    {
        respuesta.Headers.CacheControl = "no-store";
        respuesta.Headers.XContentTypeOptions = "nosniff";
        var web = opcionesDeCorreo.Value.BaseDeLaWeb.TrimEnd('/');
        var icono = web + RutaDelIcono;

        var diseno = await casoDeUso.ObtenerCompartidoAsync(enlace, cancelacion);
        if (diseno is null)
        {
            return Results.Content(TarjetaDeDiseno.Generica(web, icono), "text/html; charset=utf-8", statusCode: StatusCodes.Status404NotFound);
        }

        var vista = await casoDeUso.ObtenerVistaPreviaAsync(enlace, cancelacion);
        var imagen = vista is null
            ? null
            : $"{peticion.Scheme}://{peticion.Host}/compartidos/{Uri.EscapeDataString(enlace)}/imagen?v={vista.Fecha.ToUnixTimeSeconds()}";
        var html = TarjetaDeDiseno.DeDiseno(
            diseno.Nombre.Valor,
            TiposDeEstancia.ATexto(diseno.Tipo),
            $"{web}/compartido/{Uri.EscapeDataString(enlace)}",
            imagen,
            icono);
        return Results.Content(html, "text/html; charset=utf-8");
    }

    private static IResult NoEncontrado() =>
        Results.NotFound(new RespuestaDeMensaje(TextosDeEstado.DeRechazo(EstadoDeDiseno.NoEncontrado)));
}
