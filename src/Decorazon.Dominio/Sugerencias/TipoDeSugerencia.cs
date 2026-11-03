namespace Decorazon.Dominio.Sugerencias;

/// <summary>De qué va una sugerencia. Lo elige quien la escribe.</summary>
public enum TipoDeSugerencia
{
    Mejora,
    Funcionalidad,
    Error,
    Pregunta,
    Otra
}

/// <summary>
/// Los nombres de <see cref="TipoDeSugerencia"/> en el contrato de la API: <c>mejora</c>,
/// <c>funcionalidad</c>, <c>error</c>, <c>pregunta</c> y <c>otra</c>.
/// </summary>
/// <remarks>
/// Una tabla y no <see cref="Enum.TryParse{TEnum}(string?, out TEnum)"/>: ese aceptaría también
/// números ("7") y nombres con otras mayúsculas, y el contrato son solo estos cinco.
/// </remarks>
public static class TiposDeSugerencia
{
    private static readonly Dictionary<string, TipoDeSugerencia> PorNombre = new(StringComparer.Ordinal)
    {
        ["mejora"] = TipoDeSugerencia.Mejora,
        ["funcionalidad"] = TipoDeSugerencia.Funcionalidad,
        ["error"] = TipoDeSugerencia.Error,
        ["pregunta"] = TipoDeSugerencia.Pregunta,
        ["otra"] = TipoDeSugerencia.Otra
    };

    public static bool TryLeer(string? nombre, out TipoDeSugerencia tipo)
    {
        tipo = default;
        return nombre is not null && PorNombre.TryGetValue(nombre, out tipo);
    }

    public static string Nombre(TipoDeSugerencia tipo) =>
        PorNombre.First(par => par.Value == tipo).Key;
}
