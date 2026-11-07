using Decorazon.Dominio.Disenos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Decorazon.Infraestructura.Persistencia.Configuraciones;

public sealed class ConfiguracionDeVersionAnterior : IEntityTypeConfiguration<VersionAnterior>
{
    public void Configure(EntityTypeBuilder<VersionAnterior> constructor)
    {
        constructor.ToTable("versiones_anteriores");

        // Una por diseño: la clave es la del diseño.
        constructor.HasKey(copia => copia.DisenoId).HasName("pk_versiones_anteriores");

        constructor.Property(copia => copia.DisenoId)
            .HasColumnName("diseno_id")
            .ValueGeneratedNever();

        // Cascada: al borrar el diseño (o la cuenta, que borra sus diseños) desaparece con él.
        constructor.HasOne<Diseno>()
            .WithOne()
            .HasForeignKey<VersionAnterior>(copia => copia.DisenoId)
            .OnDelete(DeleteBehavior.Cascade);

        constructor.Property(copia => copia.Nombre)
            .HasConversion(Conversiones.Nombre)
            .HasColumnName("nombre")
            .HasMaxLength(NombreDeDiseno.LongitudMaxima)
            .IsRequired();

        constructor.Property(copia => copia.Tipo)
            .HasConversion(Conversiones.Tipo)
            .HasColumnName("tipo")
            .HasMaxLength(20)
            .IsRequired();

        // Como el diseño: jsonb, y al leer se reconstruye sin revalidar.
        constructor.Property(copia => copia.Contenido)
            .HasConversion(Conversiones.Contenido)
            .HasColumnName("contenido")
            .HasColumnType("jsonb")
            .IsRequired();

        constructor.Property(copia => copia.Fecha)
            .HasColumnName("fecha")
            .IsRequired();

        constructor.Property(copia => copia.Pedida)
            .HasColumnName("pedida")
            .IsRequired();

        constructor.Property(copia => copia.Tomada)
            .HasColumnName("tomada")
            .IsRequired();

        constructor.Property(copia => copia.Version)
            .HasColumnName("version")
            .IsRequired();
    }
}
