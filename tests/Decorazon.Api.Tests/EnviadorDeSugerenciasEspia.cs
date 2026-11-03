using System.Collections.Concurrent;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Sugerencias;

namespace Decorazon.Api.Tests;

/// <summary>
/// Buzón de pruebas: guarda las sugerencias en vez de entregarlas. Ningún test debe
/// llegar al buzón real del autor.
/// </summary>
public sealed class EnviadorDeSugerenciasEspia : IEnviadorDeSugerencias
{
    private readonly ConcurrentQueue<Sugerencia> _enviadas = new();

    public IReadOnlyCollection<Sugerencia> Enviadas => _enviadas;

    /// <summary>Si está a <c>true</c>, el envío falla como un buzón caído.</summary>
    public bool BuzonCaido { get; set; }

    public Task EnviarAsync(Sugerencia sugerencia, CancellationToken cancelacion = default)
    {
        if (BuzonCaido)
        {
            throw new SugerenciaNoEnviadaException("Buzón caído (simulado).");
        }

        _enviadas.Enqueue(sugerencia);
        return Task.CompletedTask;
    }

    /// <summary>Las enviadas con ese texto: los tests de una clase comparten buzón.</summary>
    public IReadOnlyList<Sugerencia> ConTexto(string texto) =>
        _enviadas.Where(sugerencia => sugerencia.Texto.Valor == texto).ToList();
}
