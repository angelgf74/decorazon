namespace Decorazon.Dominio.Disenos;

/// <summary>
/// Nombre que el usuario da a un diseño. Se guarda tal cual lo escribió, solo
/// sin espacios en los extremos; la longitud se cuenta ya recortado.
/// </summary>
public sealed record NombreDeDiseno
{
    public const int LongitudMaxima = 100;

    private NombreDeDiseno(string valor) => Valor = valor;

    public string Valor { get; }

    public static bool TryCrear(string? texto, out NombreDeDiseno nombre)
    {
        nombre = null!;
        var recortado = texto?.Trim();

        // Sin caracteres de control: no pintan nada en un nombre, y el nulo,
        // además, no cabe en una columna de texto de PostgreSQL (22021).
        if (string.IsNullOrEmpty(recortado) || recortado.Length > LongitudMaxima || recortado.Any(char.IsControl))
        {
            return false;
        }

        nombre = new NombreDeDiseno(recortado);
        return true;
    }

    public override string ToString() => Valor;
}
