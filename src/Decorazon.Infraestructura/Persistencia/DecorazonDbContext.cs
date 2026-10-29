using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

/// <summary>
/// Contexto de EF Core contra PostgreSQL. Las configuraciones de cada entidad
/// viven en <c>Configuraciones/</c>.
/// </summary>
public sealed class DecorazonDbContext(DbContextOptions<DecorazonDbContext> opciones) : DbContext(opciones)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();

    public DbSet<SolicitudDeRegistro> SolicitudesDeRegistro => Set<SolicitudDeRegistro>();

    public DbSet<SolicitudDeContrasena> SolicitudesDeContrasena => Set<SolicitudDeContrasena>();

    public DbSet<Diseno> Disenos => Set<Diseno>();

    protected override void OnModelCreating(ModelBuilder modelo)
    {
        modelo.ApplyConfigurationsFromAssembly(typeof(DecorazonDbContext).Assembly);
    }
}
