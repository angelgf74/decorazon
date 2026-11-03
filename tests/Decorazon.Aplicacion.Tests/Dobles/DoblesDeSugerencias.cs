using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Sugerencias;

namespace Decorazon.Aplicacion.Tests.Dobles;

/// <summary>Guarda las sugerencias en vez de entregarlas, y puede fallar como un buzón caído.</summary>
public sealed class EnviadorDeSugerenciasEspia : IEnviadorDeSugerencias
{
    public List<Sugerencia> Enviadas { get; } = [];

    /// <summary>Si está a <c>true</c>, el envío falla como un buzón caído.</summary>
    public bool BuzonCaido { get; set; }

    public Task EnviarAsync(Sugerencia sugerencia, CancellationToken cancelacion = default)
    {
        if (BuzonCaido)
        {
            throw new SugerenciaNoEnviadaException("Buzón caído (simulado).");
        }

        Enviadas.Add(sugerencia);
        return Task.CompletedTask;
    }
}
