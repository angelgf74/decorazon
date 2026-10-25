namespace Decorazon.Dominio.Puertos;

/// <summary>
/// Borra los enlaces por correo que ya no sirven: solicitudes de alta y
/// solicitudes de contraseña.
/// </summary>
public interface ILimpiezaDeCaducados
{
    /// <summary>
    /// Borra las terminadas antes de <paramref name="limite"/>. Terminada es
    /// usada o caducada, lo que ocurriera antes; anular un enlace lo deja
    /// caducado en ese momento. Lo vigente no se toca nunca.
    /// </summary>
    Task<ResultadoDeLimpieza> BorrarTerminadasAntesDeAsync(DateTimeOffset limite, CancellationToken cancelacion = default);
}

/// <summary>Filas borradas de cada tabla.</summary>
public sealed record ResultadoDeLimpieza(int SolicitudesDeAlta, int SolicitudesDeContrasena)
{
    public int Total => SolicitudesDeAlta + SolicitudesDeContrasena;
}
