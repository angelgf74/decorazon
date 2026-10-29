using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Decorazon.Infraestructura.Tests.Persistencia;

/// <summary>
/// Provoca una carrera real: ejecuta <paramref name="carrera"/> (otro contexto,
/// otra conexión, ya confirmado) justo antes del primer guardado del contexto que
/// lo lleva, es decir, entre que el caso de uso lee y que escribe. Solo una vez.
/// </summary>
public sealed class CarreraAntesDeGuardar(Func<Task> carrera) : SaveChangesInterceptor
{
    private Func<Task>? _pendiente = carrera;

    public bool Ocurrio => _pendiente is null;

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData datos,
        InterceptionResult<int> resultado,
        CancellationToken cancelacion = default)
    {
        var accion = Interlocked.Exchange(ref _pendiente, null);
        if (accion is not null)
        {
            await accion();
        }

        return resultado;
    }
}
