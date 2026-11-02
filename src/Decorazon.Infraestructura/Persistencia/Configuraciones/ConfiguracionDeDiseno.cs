using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Decorazon.Infraestructura.Persistencia.Configuraciones;

public sealed class ConfiguracionDeDiseno : IEntityTypeConfiguration<Diseno>
{
    public void Configure(EntityTypeBuilder<Diseno> constructor)
    {
        constructor.ToTable("disenos");

        constructor.HasKey(diseno => diseno.Id);

        constructor.Property(diseno => diseno.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        constructor.Property(diseno => diseno.UsuarioId)
            .HasColumnName("usuario_id")
            .IsRequired();

        // Cascada además del borrado explícito de IBorradoDeCuentas: si una tabla
        // futura o un borrado a mano se saltara ese paso, no quedarían huérfanos.
        constructor.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(diseno => diseno.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        constructor.Property(diseno => diseno.Nombre)
            .HasConversion(Conversiones.Nombre)
            .HasColumnName("nombre")
            .HasMaxLength(NombreDeDiseno.LongitudMaxima)
            .IsRequired();

        constructor.Property(diseno => diseno.Tipo)
            .HasConversion(Conversiones.Tipo)
            .HasColumnName("tipo")
            .HasMaxLength(20)
            .IsRequired();

        // jsonb normaliza el documento (reordena claves, quita espacios): lo que se
        // lee es semánticamente igual, no idéntico byte a byte.
        constructor.Property(diseno => diseno.Contenido)
            .HasConversion(Conversiones.Contenido)
            .HasColumnName("contenido")
            .HasColumnType("jsonb")
            .IsRequired();

        constructor.Property(diseno => diseno.FechaDeCreacion)
            .HasColumnName("fecha_de_creacion")
            .IsRequired();

        constructor.Property(diseno => diseno.FechaDeModificacion)
            .HasColumnName("fecha_de_modificacion")
            .IsRequired();

        // Token de concurrencia: el dominio la sube en cada cambio, y EF añade
        // "WHERE version = <la leída>" al UPDATE. Dos guardados simultáneos que
        // pasaron la comprobación de If-Match no se pisan: el segundo falla.
        constructor.Property(diseno => diseno.Version)
            .HasColumnName("version")
            .IsConcurrencyToken()
            .IsRequired();

        constructor.Property(diseno => diseno.EnlaceCompartido)
            .HasColumnName("enlace_compartido")
            .HasMaxLength(64);

        // Único: un enlace lleva a un solo diseño. PostgreSQL admite varios null.
        constructor.HasIndex(diseno => diseno.EnlaceCompartido)
            .IsUnique()
            .HasDatabaseName("ix_disenos_enlace_compartido");

        // El listado va por usuario y del más reciente al más antiguo.
        constructor.HasIndex(diseno => new { diseno.UsuarioId, diseno.FechaDeModificacion })
            .HasDatabaseName("ix_disenos_usuario_modificacion");
    }
}
