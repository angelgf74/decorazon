using System.Text.RegularExpressions;

namespace Decorazon.Dominio.Usuarios;

/// <summary>
/// Nombre con el que el usuario se presenta. Se guarda tal cual lo escribió:
/// con sus mayúsculas y acentos, solo sin espacios sobrantes.
/// </summary>
public sealed partial class NombreDeUsuario : IEquatable<NombreDeUsuario>
{
    public const int LongitudMaxima = 100;

    private NombreDeUsuario(string valor) => Valor = valor;

    public string Valor { get; }

    public static bool TryCrear(string? entrada, out NombreDeUsuario nombre)
    {
        nombre = null!;

        if (string.IsNullOrWhiteSpace(entrada))
        {
            return false;
        }

        var normalizado = EspaciosSeguidos().Replace(entrada.Trim(), " ");

        if (normalizado.Length > LongitudMaxima)
        {
            return false;
        }

        nombre = new NombreDeUsuario(normalizado);
        return true;
    }

    public static NombreDeUsuario Crear(string entrada) =>
        TryCrear(entrada, out var nombre)
            ? nombre
            : throw new ArgumentException($"Nombre no válido: '{entrada}'.", nameof(entrada));

    public bool Equals(NombreDeUsuario? otro) =>
        otro is not null && string.Equals(Valor, otro.Valor, StringComparison.Ordinal);

    public override bool Equals(object? obj) => Equals(obj as NombreDeUsuario);

    public override int GetHashCode() => Valor.GetHashCode(StringComparison.Ordinal);

    public override string ToString() => Valor;

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant)]
    private static partial Regex EspaciosSeguidos();
}
