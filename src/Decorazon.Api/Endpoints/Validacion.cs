using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.Validation;

// ASP0029: los resolutores de validación son API "en evaluación" en .NET 10.
// Es la única forma de saltarse JsonElement sin que Contratos dependa de
// ASP.NET ([SkipValidation]); si la API cambia, falla al compilar, no en silencio.
#pragma warning disable ASP0029

namespace Decorazon.Api.Endpoints;

/// <summary>
/// Las DataAnnotations de los contratos se aplican antes de llegar al endpoint.
/// </summary>
public static class Validacion
{
    public static IServiceCollection AnadirValidacion(this IServiceCollection servicios)
    {
        servicios.AddValidation();

        // Después del resolutor generado, para ir delante de él: el generador
        // describe JsonElement como un tipo con propiedades (su indizador) y la
        // validación revienta al recorrerlo. El contenido de un diseño lo valida
        // el dominio, no las DataAnnotations.
        servicios.Configure<ValidationOptions>(opciones =>
            opciones.Resolvers.Insert(0, new JsonElementSinValidar()));

        return servicios;
    }

    private sealed class JsonElementSinValidar : IValidatableInfoResolver, IValidatableInfo
    {
        public bool TryGetValidatableTypeInfo(Type tipo, [NotNullWhen(true)] out IValidatableInfo? informacion)
        {
            informacion = tipo == typeof(JsonElement) || tipo == typeof(JsonElement?) ? this : null;
            return informacion is not null;
        }

        public bool TryGetValidatableParameterInfo(
            ParameterInfo parametro, [NotNullWhen(true)] out IValidatableInfo? informacion)
        {
            informacion = null;
            return false;
        }

        public Task ValidateAsync(object? valor, ValidateContext contexto, CancellationToken cancelacion) =>
            Task.CompletedTask;
    }
}
