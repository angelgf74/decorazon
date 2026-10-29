namespace Decorazon.Dominio.Puertos;

/// <summary>
/// Borra los enlaces por correo que ya no sirven (solicitudes de alta y de
/// contraseña) y el diseño que guardaban las altas caducadas.
/// </summary>
public interface ILimpiezaDeCaducados
{
    /// <summary>
    /// Borra las terminadas antes de <paramref name="limite"/>. Terminada es
    /// usada o caducada, lo que ocurriera antes; anular un enlace lo deja
    /// caducado en ese momento. Lo vigente no se toca nunca.
    /// </summary>
    Task<ResultadoDeLimpieza> BorrarTerminadasAntesDeAsync(DateTimeOffset limite, CancellationToken cancelacion = default);

    /// <summary>
    /// Vacía el diseño de toda solicitud de alta caducada en <paramref name="ahora"/>
    /// (el diseño "se borra al caducar o al completarse"). La solicitud en sí se
    /// conserva hasta que <see cref="BorrarTerminadasAntesDeAsync"/> la alcance.
    /// </summary>
    /// <returns>Cuántos diseños se han descartado.</returns>
    Task<int> DescartarDisenosCaducadosAsync(DateTimeOffset ahora, CancellationToken cancelacion = default);
}

/// <summary>Filas borradas de cada tabla y diseños pendientes descartados.</summary>
/// <remarks><see cref="Total"/> cuenta solo filas borradas: descartar un diseño no borra ninguna.</remarks>
public sealed record ResultadoDeLimpieza(int SolicitudesDeAlta, int SolicitudesDeContrasena, int DisenosDescartados = 0)
{
    public int Total => SolicitudesDeAlta + SolicitudesDeContrasena;
}
