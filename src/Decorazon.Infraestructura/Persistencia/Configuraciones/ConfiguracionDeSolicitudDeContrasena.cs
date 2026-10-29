using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Infraestructura.Persistencia.Configuraciones;

public sealed class ConfiguracionDeSolicitudDeContrasena : IEntityTypeConfiguration<SolicitudDeContrasena>
{
    public void Configure(EntityTypeBuilder<SolicitudDeContrasena> constructor)
    {
        constructor.ToTable("solicitudes_de_contrasena");

        constructor.HasKey(solicitud => solicitud.Id);

        constructor.Property(solicitud => solicitud.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        constructor.Property(solicitud => solicitud.UsuarioId)
            .HasColumnName("usuario_id")
            .IsRequired();

        // Clave foránea con borrado en cascada: si se va la cuenta, sus enlaces
        // pendientes no deben sobrevivirla.
        constructor.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(solicitud => solicitud.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        constructor.HasIndex(solicitud => solicitud.UsuarioId)
            .HasDatabaseName("ix_solicitudes_contrasena_usuario");

        constructor.Property(solicitud => solicitud.HashDelToken)
            .HasColumnName("hash_del_token")
            .HasMaxLength(64)
            .IsRequired();

        // Se busca por este campo en cada intento de restablecer.
        constructor.HasIndex(solicitud => solicitud.HashDelToken)
            .IsUnique()
            .HasDatabaseName("ix_solicitudes_contrasena_hash_del_token");

        constructor.Property(solicitud => solicitud.FechaDeCreacion)
            .HasColumnName("fecha_de_creacion")
            .IsRequired();

        constructor.Property(solicitud => solicitud.FechaDeCaducidad)
            .HasColumnName("fecha_de_caducidad")
            .IsRequired();

        // Token de concurrencia: consumir o invalidar añade "WHERE fecha_de_consumo IS NULL"
        // al UPDATE. Dos usos simultáneos del mismo enlace pasan los dos la comprobación en
        // memoria, pero solo el primero escribe; el segundo falla y el adaptador lo traduce.
        constructor.Property(solicitud => solicitud.FechaDeConsumo)
            .HasColumnName("fecha_de_consumo")
            .IsConcurrencyToken();
    }
}
