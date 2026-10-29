using Decorazon.Dominio.Puertos;

namespace Decorazon.Aplicacion.Limpieza;

/// <summary>
/// Borra las solicitudes terminadas hace más de <see cref="PlazoDeConservacion"/>
/// y vacía el diseño de las solicitudes de registro ya caducadas.
/// </summary>
/// <remarks>
/// Quien pide el alta y no la completa dejaba su correo guardado sin plazo. Se
/// conservan 7 días para poder responder a un "no me llegó el enlace", y es el
/// mismo plazo que el de las copias de seguridad: a los 14 días no queda rastro.
/// La política de privacidad lo dice; si cambia uno, cambia la otra.
/// <para>
/// El diseño pendiente no espera a esos 7 días: se descarta en cuanto la
/// solicitud caduca, porque el alta ya no puede completarse y no hay motivo
/// para seguir guardando un contenido que nadie va a recuperar.
/// </para>
/// </remarks>
public sealed class LimpiarCaducados(ILimpiezaDeCaducados limpieza, IReloj reloj)
{
    public static readonly TimeSpan PlazoDeConservacion = TimeSpan.FromDays(7);

    public async Task<ResultadoDeLimpieza> EjecutarAsync(CancellationToken cancelacion = default)
    {
        var ahora = reloj.Ahora;

        var disenosDescartados = await limpieza.DescartarDisenosCaducadosAsync(ahora, cancelacion);
        var borradas = await limpieza.BorrarTerminadasAntesDeAsync(ahora - PlazoDeConservacion, cancelacion);

        return borradas with { DisenosDescartados = disenosDescartados };
    }
}
