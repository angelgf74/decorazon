using System.Text.RegularExpressions;

namespace Decorazon.Dominio.Usuarios;

/// <summary>
/// Correo electrónico validado y normalizado. Existir ya implica ser válido:
/// no hay forma de pasear un correo sin comprobar por las capas de arriba.
/// </summary>
public sealed partial class CorreoElectronico : IEquatable<CorreoElectronico>
{
    public const int LongitudMaxima = 254;

    private CorreoElectronico(string valor) => Valor = valor;

    public string Valor { get; }

    /// <summary>
    /// Crea el correo si el formato es aceptable. Normaliza a minúsculas para que
    /// la unicidad no dependa de cómo lo escriba el usuario.
    /// </summary>
    public static bool TryCrear(string? entrada, out CorreoElectronico correo)
    {
        correo = null!;

        if (string.IsNullOrWhiteSpace(entrada))
        {
            return false;
        }

        var normalizado = entrada.Trim().ToLowerInvariant();

        if (normalizado.Length > LongitudMaxima || !FormatoDeCorreo().IsMatch(normalizado))
        {
            return false;
        }

        correo = new CorreoElectronico(normalizado);
        return true;
    }

    /// <summary>Variante para casos donde un correo inválido es un fallo de programación.</summary>
    public static CorreoElectronico Crear(string entrada) =>
        TryCrear(entrada, out var correo)
            ? correo
            : throw new ArgumentException($"Correo electrónico no válido: '{entrada}'.", nameof(entrada));

    public bool Equals(CorreoElectronico? otro) =>
        otro is not null && string.Equals(Valor, otro.Valor, StringComparison.Ordinal);

    public override bool Equals(object? obj) => Equals(obj as CorreoElectronico);

    public override int GetHashCode() => Valor.GetHashCode(StringComparison.Ordinal);

    public override string ToString() => Valor;

    // Deliberadamente permisiva: validar correos con precisión es imposible y
    // rechazar direcciones legítimas es peor que aceptar alguna imposible.
    // La comprobación real de que el buzón existe la hace el propio envío del enlace.
    [GeneratedRegex(@"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$", RegexOptions.CultureInvariant)]
    private static partial Regex FormatoDeCorreo();
}
