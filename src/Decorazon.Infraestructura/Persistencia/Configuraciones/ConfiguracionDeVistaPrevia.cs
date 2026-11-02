using Decorazon.Dominio.Disenos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Decorazon.Infraestructura.Persistencia.Configuraciones;

public sealed class ConfiguracionDeVistaPrevia : IEntityTypeConfiguration<VistaPrevia>
{
    public void Configure(EntityTypeBuilder<VistaPrevia> constructor)
    {
        constructor.ToTable("vistas_previas");

        // Una por diseño: la clave es la del diseño.
        constructor.HasKey(vista => vista.DisenoId).HasName("pk_vistas_previas");

        constructor.Property(vista => vista.DisenoId)
            .HasColumnName("diseno_id")
            .ValueGeneratedNever();

        // Cascada: al borrar el diseño (o la cuenta, que borra sus diseños) desaparece con él.
        constructor.HasOne<Diseno>()
            .WithOne()
            .HasForeignKey<VistaPrevia>(vista => vista.DisenoId)
            .OnDelete(DeleteBehavior.Cascade);

        constructor.Property(vista => vista.Imagen)
            .HasColumnName("imagen")
            .HasColumnType("bytea")
            .IsRequired();

        constructor.Property(vista => vista.Fecha)
            .HasColumnName("fecha")
            .IsRequired();
    }
}
