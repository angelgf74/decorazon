using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Salud;

namespace Decorazon.Aplicacion.Salud;

/// <summary>
/// Caso de uso que informa de si el sistema puede operar.
/// Establece el patrón de los casos de uso reales: depende de puertos,
/// nunca de tipos de infraestructura.
/// </summary>
public sealed class ConsultarSalud(IComprobadorDeAlmacen almacen)
{
    public async Task<EstadoDeSalud> EjecutarAsync(CancellationToken cancelacion = default)
    {
        bool baseDeDatos;

        // Una dependencia que revienta al comprobarla no está sana: se traduce a
        // false, nunca se propaga. Si la excepción llegara al endpoint, la sonda
        // recibiría un 500 y no sabría si falla la dependencia o el diagnóstico.
        try
        {
            baseDeDatos = await almacen.RespondeAsync(cancelacion);
        }
        catch (Exception excepcion) when (excepcion is not OperationCanceledException)
        {
            baseDeDatos = false;
        }

        return new EstadoDeSalud(baseDeDatos);
    }
}
