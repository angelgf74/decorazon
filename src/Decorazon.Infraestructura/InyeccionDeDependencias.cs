using Microsoft.Extensions.DependencyInjection;

namespace Decorazon.Infraestructura;

public static class InyeccionDeDependencias
{
    /// <summary>
    /// Punto único donde la API registra la infraestructura. Empieza vacío: cada
    /// adaptador (persistencia, seguridad, correo) se añade en la tarea que lo estrena.
    /// </summary>
    public static IServiceCollection AddInfraestructura(this IServiceCollection servicios) => servicios;
}
