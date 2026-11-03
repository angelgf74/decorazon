using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Sugerencias;
using Microsoft.Extensions.Logging;

namespace Decorazon.Infraestructura.Sugerencias;

/// <summary>
/// Enviador para desarrollo y pruebas: escribe la sugerencia en el log en vez de mandarla.
/// Es el registrado por defecto, para que ninguna máquina de desarrollo llene el buzón real.
/// </summary>
public sealed class EnviadorDeSugerenciasDeConsola(ILogger<EnviadorDeSugerenciasDeConsola> registro)
    : IEnviadorDeSugerencias
{
    public Task EnviarAsync(Sugerencia sugerencia, CancellationToken cancelacion = default)
    {
        registro.LogInformation(
            "[SUGERENCIA SIMULADA] {Tipo} de {Correo}: {Texto}",
            TiposDeSugerencia.Nombre(sugerencia.Tipo),
            sugerencia.Correo.Valor,
            sugerencia.Texto.Valor);

        return Task.CompletedTask;
    }
}
