using Decorazon.Dominio.Puertos;

namespace Decorazon.Infraestructura.Tiempo;

/// <summary>Reloj real, siempre en UTC.</summary>
public sealed class RelojDelSistema : IReloj
{
    public DateTimeOffset Ahora => DateTimeOffset.UtcNow;
}
