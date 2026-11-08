using Decorazon.Aplicacion.Administracion;
using Decorazon.Contratos.Administracion;

namespace Decorazon.Api.Endpoints;

/// <summary>
/// La vista de administración. Solo para los tokens con el claim de
/// administrador (<see cref="Politicas.Administrador"/>).
/// </summary>
/// <remarks>
/// Sin el claim se responde 403 y no 404. El 404 del proyecto esconde si un
/// recurso ajeno existe; aquí el endpoint está en el OpenAPI público y la ruta
/// en la web, así que esconderlo no gana nada, y un 403 le dice a la web «no es
/// para ti» sin cerrarle la sesión como haría un 401.
/// </remarks>
public static class AdministracionEndpoints
{
    public static void MapearEndpointsDeAdministracion(this IEndpointRouteBuilder rutas)
    {
        var grupo = rutas.MapGroup("/administracion")
            .RequireAuthorization(Politicas.Administrador)
            .WithTags("Administracion");

        grupo.MapGet("/usuarios", ListarUsuariosAsync)
            .WithName("listarUsuarios")
            .Produces<RespuestaDeListadoDeUsuarios>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);
    }

    private static async Task<IResult> ListarUsuariosAsync(ListarUsuarios casoDeUso, CancellationToken cancelacion)
    {
        var listado = await casoDeUso.EjecutarAsync(cancelacion);

        return Results.Ok(new RespuestaDeListadoDeUsuarios(
            listado.Usuarios
                .Select(u => new RespuestaDeUsoDeUsuario(u.Id, u.Correo, u.Nombre, u.FechaDeAlta, u.Disenos, u.Bytes))
                .ToList(),
            listado.TotalDeDisenos,
            listado.TotalDeBytes));
    }
}
