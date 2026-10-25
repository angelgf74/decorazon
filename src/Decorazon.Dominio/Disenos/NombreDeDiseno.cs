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

        if (string.IsNullOrEmpty(recortado) || recortado.Length > LongitudMaxima)
        {
            return false;
        }

        nombre = new NombreDeDiseno(recortado);
        return true;
    }

    public override string ToString() => Valor;
}
