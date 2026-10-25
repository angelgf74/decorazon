namespace Decorazon.Dominio.Usuarios;

/// <summary>
/// Contraseña en claro que ya ha superado la política del proyecto.
/// Vive solo el tiempo necesario para derivarla: nunca se persiste ni se registra.
/// </summary>
public sealed class Contrasena
{
    /// <summary>
    /// Longitud mínima. Se prefiere exigir longitud antes que composición
    /// (mayúsculas, símbolos): las reglas de composición empujan a contraseñas
    /// predecibles del tipo "Contrasena1!" y no aportan entropía real.
    /// </summary>
    public const int LongitudMinima = 12;

    /// <summary>Tope para que nadie use el endpoint como generador de carga de CPU.</summary>
    public const int LongitudMaxima = 128;

    private Contrasena(string valor) => Valor = valor;

    public string Valor { get; }

    public static bool TryCrear(string? entrada, out Contrasena contrasena)
    {
        contrasena = null!;

        if (string.IsNullOrEmpty(entrada))
        {
            return false;
        }

        if (entrada.Length is < LongitudMinima or > LongitudMaxima)
        {
            return false;
        }

        contrasena = new Contrasena(entrada);
        return true;
    }

    /// <summary>Evita que la contraseña acabe en un log por un volcado accidental del objeto.</summary>
    public override string ToString() => "***";
}
