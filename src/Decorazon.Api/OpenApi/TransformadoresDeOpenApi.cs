using Decorazon.Contratos.Disenos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Decorazon.Api.OpenApi;

/// <summary>
/// Lo que el documento OpenAPI no deduce solo y el cliente TypeScript necesita:
/// la autenticación Bearer, el contenido de un diseño como objeto y las
/// cabeceras de la concurrencia (<c>If-Match</c>, <c>ETag</c>).
/// </summary>
public static class TransformadoresDeOpenApi
{
    private const string EsquemaBearer = "Bearer";

    public static OpenApiOptions AnadirTransformadoresDeDecorazon(this OpenApiOptions opciones)
    {
        opciones.AddDocumentTransformer((documento, _, _) =>
        {
            documento.Components ??= new OpenApiComponents();
            documento.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
            documento.Components.SecuritySchemes[EsquemaBearer] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT"
            };
            return Task.CompletedTask;
        });

        // Solo las operaciones que exigen sesión: así el cliente sabe cuáles
        // llevan el token sin una lista de rutas que mantener aparte.
        opciones.AddOperationTransformer((operacion, contexto, _) =>
        {
            if (contexto.Description.ActionDescriptor.EndpointMetadata.OfType<IAuthorizeData>().Any())
            {
                operacion.Security ??= [];
                operacion.Security.Add(new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference(EsquemaBearer, contexto.Document)] = []
                });
            }
            return Task.CompletedTask;
        });

        // JsonElement sale como esquema vacío ("cualquier cosa"); el contenido de
        // un diseño es siempre un objeto JSON.
        opciones.AddSchemaTransformer((esquema, contexto, _) =>
        {
            var tipo = contexto.JsonTypeInfo.Type;
            if ((tipo == typeof(PeticionDeDiseno) || tipo == typeof(RespuestaDeDiseno))
                && esquema.Properties?.ContainsKey("contenido") == true)
            {
                esquema.Properties["contenido"] = new OpenApiSchema { Type = JsonSchemaType.Object };
            }
            return Task.CompletedTask;
        });

        return opciones;
    }

    /// <summary>Parámetro <c>If-Match</c> obligatorio: la versión que el cliente editó.</summary>
    public static RouteHandlerBuilder ConIfMatch(this RouteHandlerBuilder ruta) =>
        ruta.AddOpenApiOperationTransformer((operacion, _, _) =>
        {
            operacion.Parameters ??= [];
            operacion.Parameters.Add(new OpenApiParameter
            {
                Name = "If-Match",
                In = ParameterLocation.Header,
                Required = true,
                Description = "Versión del diseño que se editó, entre comillas: \"3\".",
                Schema = new OpenApiSchema { Type = JsonSchemaType.String }
            });
            return Task.CompletedTask;
        });

    /// <summary>
    /// Cabecera <c>ETag</c> en las respuestas que llevan un diseño (y en el 412,
    /// con la versión actual), y <c>Location</c> en el 201 y en el 200 de un <c>POST</c>
    /// (el alta repetida con el mismo id).
    /// </summary>
    public static RouteHandlerBuilder ConETag(this RouteHandlerBuilder ruta) =>
        ruta.AddOpenApiOperationTransformer((operacion, contexto, _) =>
        {
            var esPost = HttpMethods.IsPost(contexto.Description.HttpMethod ?? "");

            foreach (var (codigo, respuesta) in operacion.Responses ?? [])
            {
                if (respuesta is not OpenApiResponse editable
                    || (codigo is not ("200" or "201" or "412")))
                {
                    continue;
                }

                editable.Headers ??= new Dictionary<string, IOpenApiHeader>();
                editable.Headers["ETag"] = Cabecera("Versión del diseño, entre comillas: \"3\".");

                if (codigo == "201" || (codigo == "200" && esPost))
                {
                    editable.Headers["Location"] = Cabecera("Ruta del diseño creado.");
                }
            }
            return Task.CompletedTask;
        });

    private static OpenApiHeader Cabecera(string descripcion) => new()
    {
        Description = descripcion,
        Schema = new OpenApiSchema { Type = JsonSchemaType.String }
    };
}
