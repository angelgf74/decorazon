using Decorazon.Dominio.Disenos;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Decorazon.Infraestructura.Persistencia.Configuraciones;

/// <summary>
/// Conversiones de los objetos valor del diseño, compartidas por la tabla de
/// diseños y por el diseño pendiente de las solicitudes de alta.
/// </summary>
internal static class Conversiones
{
    public static readonly ValueConverter<NombreDeDiseno, string> Nombre = new(
        nombre => nombre.Valor,
        texto => ReconstruirNombre(texto));

    public static readonly ValueConverter<TipoDeEstancia, string> Tipo = new(
        tipo => TiposDeEstancia.ATexto(tipo),
        texto => ATipo(texto));

    public static readonly ValueConverter<ContenidoDeDiseno, string> Contenido = new(
        contenido => contenido.Json,
        json => ContenidoDeDiseno.Reconstruir(json));

    // El contenido no se revalida al leer (ver ContenidoDeDiseno.Reconstruir). Nombre y
    // tipo sí: si lo guardado no se puede leer, la base de datos
    // está corrupta y es mejor fallar a gritos que inventar un valor.
    private static NombreDeDiseno ReconstruirNombre(string texto) =>
        NombreDeDiseno.TryCrear(texto, out var nombre)
            ? nombre
            : throw new InvalidOperationException("Nombre de diseño guardado no válido.");

    private static TipoDeEstancia ATipo(string texto) =>
        TiposDeEstancia.TryDesdeTexto(texto, out var tipo)
            ? tipo
            : throw new InvalidOperationException($"Tipo de estancia guardado no válido: '{texto}'.");
}
