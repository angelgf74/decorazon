using Decorazon.Aplicacion.Limpieza;

namespace Decorazon.Api.Tareas;

/// <summary>
/// Lanza <see cref="LimpiarCaducados"/> al arrancar y luego cada
/// <see cref="Intervalo"/>.
/// </summary>
/// <remarks>
/// Al arrancar y cada 24 horas, y no a una hora fija: cada despliegue reinicia
/// la API, y una hora fija sería otro reloj que probar sin ganar nada.
/// <para>
/// <b>Cada vuelta atrapa sus errores.</b> Desde .NET 6, una excepción que se
/// escapa de un <see cref="BackgroundService"/> para el host entero: una base de
/// datos caída un momento a medianoche tumbaría la API. Aquí se registra y se
/// vuelve a intentar en la siguiente vuelta.
/// </para>
/// <para>
/// Se registra solo con <c>Limpieza:Activa</c> (por defecto, sí). Los tests la
/// apagan: correría antes de que la fixture migre la base.
/// </para>
/// </remarks>
public sealed class TareaDeLimpieza(IServiceScopeFactory ambitos, ILogger<TareaDeLimpieza> registro) : BackgroundService
{
    public static readonly TimeSpan Intervalo = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken cancelacion)
    {
        await VueltaAsync(cancelacion);

        using var temporizador = new PeriodicTimer(Intervalo);

        while (await temporizador.WaitForNextTickAsync(cancelacion))
        {
            await VueltaAsync(cancelacion);
        }
    }

    /// <summary>Una limpieza. Nunca lanza, salvo la cancelación al apagar.</summary>
    public async Task VueltaAsync(CancellationToken cancelacion)
    {
        try
        {
            using var ambito = ambitos.CreateScope();
            var resultado = await ambito.ServiceProvider.GetRequiredService<LimpiarCaducados>().EjecutarAsync(cancelacion);

            registro.LogInformation(
                "Limpieza de caducados: {Altas} solicitudes de alta y {Contrasenas} de contraseña borradas; {Disenos} diseños pendientes descartados.",
                resultado.SolicitudesDeAlta,
                resultado.SolicitudesDeContrasena,
                resultado.DisenosDescartados);
        }
        catch (Exception excepcion) when (excepcion is not OperationCanceledException)
        {
            registro.LogError(excepcion, "La limpieza de caducados ha fallado; se reintentará en la siguiente vuelta.");
        }
    }
}
