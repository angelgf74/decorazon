using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using Decorazon.Api.OpenApi;
using Decorazon.Aplicacion.Disenos;
using Decorazon.Contratos;
using Decorazon.Contratos.Disenos;
using Decorazon.Dominio.Disenos;
using Microsoft.AspNetCore.Mvc;
using PeticionDelCasoDeUso = Decorazon.Aplicacion.Disenos.PeticionDeDiseno;
using PeticionDeDiseno = Decorazon.Contratos.Disenos.PeticionDeDiseno;

namespace Decorazon.Api.Endpoints;

/// <summary>
/// Los diseños de la cuenta de la sesión. El usuario sale siempre del token:
/// un diseño ajeno responde igual que uno que no existe, <c>404</c>.
/// </summary>
/// <remarks>
/// Concurrencia optimista con <c>ETag</c>: cada respuesta con un diseño lleva
/// <c>ETag: "&lt;version&gt;"</c>, y <c>PUT</c> exige <c>If-Match</c> con la
/// versión que el cliente editó. Así, dos pestañas abiertas no se pisan en
/// silencio: la segunda en guardar recibe un 412 con la versión actual.
/// </remarks>
public static class DisenosEndpoints
{
    private const string MensajeDeVersionDistinta = "El diseño ha cambiado en otro sitio.";

    /// <summary>
    /// Lo que se compara cuando <c>If-Match</c> no es una versión legible. Las
    /// versiones empiezan en 1, así que nunca coincide: el caso de uso responde
    /// 412 si el diseño existe y 404 si no, igual que con una versión vieja.
    /// </summary>
    private const int VersionQueNuncaCoincide = 0;

    public static void MapearEndpointsDeDisenos(this IEndpointRouteBuilder rutas)
    {
        var grupo = rutas.MapGroup("/disenos")
            .RequireAuthorization()
            .WithTags("Disenos");

        grupo.MapGet("", ListarAsync)
            .WithName("listarDisenos")
            .Produces<RespuestaDeResumenDeDiseno[]>();

        grupo.MapPost("", CrearAsync)
            .WithName("crearDiseno")
            .Produces<RespuestaDeDiseno>(StatusCodes.Status201Created)
            .Produces<RespuestaDeDiseno>()
            .Produces<RespuestaDeMensaje>(StatusCodes.Status400BadRequest)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status409Conflict)
            .ConETag();

        grupo.MapGet("/{id:guid}", ObtenerAsync)
            .WithName("obtenerDiseno")
            .Produces<RespuestaDeDiseno>()
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound)
            .ConETag();

        grupo.MapPut("/{id:guid}", ActualizarAsync)
            .WithName("actualizarDiseno")
            .Produces<RespuestaDeDiseno>()
            .Produces<RespuestaDeMensaje>(StatusCodes.Status400BadRequest)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound)
            .Produces<RespuestaDeVersionDistinta>(StatusCodes.Status412PreconditionFailed)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status428PreconditionRequired)
            .ConIfMatch()
            .ConETag();

        grupo.MapPost("/{id:guid}/duplicar", DuplicarAsync)
            .WithName("duplicarDiseno")
            .Produces<RespuestaDeDiseno>(StatusCodes.Status201Created)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status409Conflict)
            .ConETag();

        grupo.MapDelete("/{id:guid}", BorrarAsync)
            .WithName("borrarDiseno")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<RespuestaDeMensaje>(StatusCodes.Status404NotFound);
    }

    /// <summary>
    /// Del contrato a la petición del caso de uso. El contenido llega como objeto
    /// JSON y se pasa como texto tal cual llegó (<c>GetRawText</c>): el dominio
    /// mide y valida exactamente lo que mandó el cliente. Ausente o <c>null</c>
    /// pasa como vacío, y el dominio lo rechaza con los demás.
    /// </summary>
    public static PeticionDelCasoDeUso ACasoDeUso(PeticionDeDiseno peticion) =>
        new(peticion.Nombre, peticion.TipoEstancia, peticion.Contenido?.GetRawText(), peticion.Id);

    private static async Task<IResult> ListarAsync(
        ClaimsPrincipal usuario,
        GestionDeDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        var disenos = await casoDeUso.ListarAsync(usuarioId, cancelacion);

        return Results.Ok(disenos.Select(diseno => new RespuestaDeResumenDeDiseno(
            diseno.Id,
            diseno.Nombre.Valor,
            TiposDeEstancia.ATexto(diseno.Tipo),
            diseno.FechaDeCreacion,
            diseno.FechaDeModificacion,
            diseno.Version,
            diseno.EnlaceCompartido)));
    }

    private static async Task<IResult> CrearAsync(
        [FromBody] PeticionDeDiseno peticion,
        ClaimsPrincipal usuario,
        HttpResponse respuesta,
        GestionDeDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        var resultado = await casoDeUso.CrearAsync(usuarioId, ACasoDeUso(peticion), cancelacion);

        switch (resultado.Estado)
        {
            case EstadoDeDiseno.Correcto:
                return Creado(respuesta, resultado.Diseno!);

            case EstadoDeDiseno.YaCreado:
                // Un reintento: lo mismo que el 201, pero 200 porque esta vez no se ha creado nada.
                PonerETag(respuesta, resultado.Diseno!);
                respuesta.Headers.Location = RutaDe(resultado.Diseno!);
                return Results.Ok(Detalle(resultado.Diseno!));

            default:
                return Rechazo(resultado);
        }
    }

    private static async Task<IResult> ObtenerAsync(
        Guid id,
        ClaimsPrincipal usuario,
        HttpResponse respuesta,
        GestionDeDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        var diseno = await casoDeUso.ObtenerAsync(usuarioId, id, cancelacion);

        if (diseno is null)
        {
            return NoEncontrado();
        }

        PonerETag(respuesta, diseno);
        return Results.Ok(Detalle(diseno));
    }

    private static async Task<IResult> ActualizarAsync(
        Guid id,
        [FromBody] PeticionDeDiseno peticion,
        HttpRequest peticionHttp,
        ClaimsPrincipal usuario,
        HttpResponse respuesta,
        GestionDeDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        if (!TryLeerIfMatch(peticionHttp, out var versionEsperada))
        {
            return Results.Json(
                new RespuestaDeMensaje("Falta la cabecera If-Match con la versión del diseño que has editado."),
                statusCode: StatusCodes.Status428PreconditionRequired);
        }

        var resultado = await casoDeUso.ActualizarAsync(usuarioId, id, versionEsperada, ACasoDeUso(peticion), cancelacion);

        switch (resultado.Estado)
        {
            case EstadoDeDiseno.Correcto:
                PonerETag(respuesta, resultado.Diseno!);
                return Results.Ok(Detalle(resultado.Diseno!));

            case EstadoDeDiseno.VersionDistinta:
                // La versión actual va en el cuerpo y en el ETag: el cliente decide
                // si recarga o sobrescribe a sabiendas con ella.
                PonerETag(respuesta, resultado.Diseno!);
                return Results.Json(
                    new RespuestaDeVersionDistinta(MensajeDeVersionDistinta, resultado.Diseno!.Version),
                    statusCode: StatusCodes.Status412PreconditionFailed);

            default:
                return Rechazo(resultado);
        }
    }

    private static async Task<IResult> DuplicarAsync(
        Guid id,
        ClaimsPrincipal usuario,
        HttpResponse respuesta,
        GestionDeDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        var resultado = await casoDeUso.DuplicarAsync(usuarioId, id, cancelacion);

        return resultado.Estado == EstadoDeDiseno.Correcto
            ? Creado(respuesta, resultado.Diseno!)
            : Rechazo(resultado);
    }

    private static async Task<IResult> BorrarAsync(
        Guid id,
        ClaimsPrincipal usuario,
        GestionDeDisenos casoDeUso,
        CancellationToken cancelacion)
    {
        if (!usuario.TryObtenerId(out var usuarioId))
        {
            return Results.Unauthorized();
        }

        return await casoDeUso.BorrarAsync(usuarioId, id, cancelacion)
            ? Results.NoContent()
            : NoEncontrado();
    }

    /// <summary>
    /// Lee la versión de <c>If-Match</c>, con comillas (<c>"3"</c>, la forma
    /// correcta) o sin ellas (<c>3</c>, por tolerancia).
    /// </summary>
    /// <returns>
    /// <c>false</c> si no hay cabecera o es <c>*</c>: <c>*</c> significa
    /// "sobrescribe lo que haya", justo lo que <c>If-Match</c> está para evitar,
    /// así que se trata como ausente (428). Cualquier otro valor que no sea una
    /// versión —una etiqueta débil <c>W/"3"</c>, texto, un número que no cabe—
    /// devuelve <c>true</c> con <see cref="VersionQueNuncaCoincide"/>: es un 412,
    /// no un 400, para no dar pistas sobre qué se esperaba.
    /// </returns>
    private static bool TryLeerIfMatch(HttpRequest peticion, out int version)
    {
        version = VersionQueNuncaCoincide;
        var valor = peticion.Headers.IfMatch.ToString().Trim();

        if (valor.Length == 0 || valor == "*")
        {
            return false;
        }

        if (valor.Length >= 2 && valor[0] == '"' && valor[^1] == '"')
        {
            valor = valor[1..^1];
        }

        if (int.TryParse(valor, NumberStyles.None, CultureInfo.InvariantCulture, out var leida))
        {
            version = leida;
        }

        return true;
    }

    private static IResult Creado(HttpResponse respuesta, Diseno diseno)
    {
        PonerETag(respuesta, diseno);
        return Results.Created(RutaDe(diseno), Detalle(diseno));
    }

    private static string RutaDe(Diseno diseno) => $"/disenos/{diseno.Id}";

    /// <summary>ETag fuerte con comillas: <c>"3"</c>.</summary>
    private static void PonerETag(HttpResponse respuesta, Diseno diseno) =>
        respuesta.Headers.ETag = $"\"{diseno.Version.ToString(CultureInfo.InvariantCulture)}\"";

    private static IResult NoEncontrado() =>
        Results.NotFound(new RespuestaDeMensaje(TextosDeEstado.DeRechazo(EstadoDeDiseno.NoEncontrado)));

    private static IResult Rechazo(ResultadoDeDiseno resultado)
    {
        var error = new RespuestaDeMensaje(TextosDeEstado.DeRechazo(resultado.Estado, resultado.Contenido));

        return resultado.Estado switch
        {
            EstadoDeDiseno.NoEncontrado => Results.NotFound(error),
            EstadoDeDiseno.LimiteAlcanzado or EstadoDeDiseno.IdentificadorEnUso => Results.Conflict(error),
            _ => Results.BadRequest(error)
        };
    }

    private static RespuestaDeDiseno Detalle(Diseno diseno)
    {
        // El contenido sale como objeto JSON, no como cadena: el mismo formato en
        // que entró. Clone porque el documento se libera al salir de aquí.
        using var documento = JsonDocument.Parse(diseno.Contenido.Json);

        return new RespuestaDeDiseno(
            diseno.Id,
            diseno.Nombre.Valor,
            TiposDeEstancia.ATexto(diseno.Tipo),
            diseno.FechaDeCreacion,
            diseno.FechaDeModificacion,
            diseno.Version,
            documento.RootElement.Clone(),
            diseno.EnlaceCompartido);
    }
}
