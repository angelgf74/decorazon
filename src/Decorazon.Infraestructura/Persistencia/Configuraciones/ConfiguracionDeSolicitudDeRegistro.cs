using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Infraestructura.Persistencia.Configuraciones;

public sealed class ConfiguracionDeSolicitudDeRegistro : IEntityTypeConfiguration<SolicitudDeRegistro>
{
    public void Configure(EntityTypeBuilder<SolicitudDeRegistro> constructor)
    {
        constructor.ToTable("solicitudes_de_registro");

        constructor.HasKey(solicitud => solicitud.Id);

        constructor.Property(solicitud => solicitud.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        constructor.Property(solicitud => solicitud.Correo)
            .HasConversion(
                correo => correo.Valor,
                valor => CorreoElectronico.Crear(valor))
            .HasColumnName("correo")
            .HasMaxLength(CorreoElectronico.LongitudMaxima)
            .IsRequired();

        // Sin índice único: el mismo correo puede acumular solicitudes a lo largo
        // del tiempo, y las anteriores se invalidan en vez de borrarse.
        constructor.HasIndex(solicitud => solicitud.Correo)
            .HasDatabaseName("ix_solicitudes_correo");

        constructor.Property(solicitud => solicitud.HashDelToken)
            .HasColumnName("hash_del_token")
            .HasMaxLength(64)
            .IsRequired();

        // Se busca por este campo en cada intento de completar el alta.
        constructor.HasIndex(solicitud => solicitud.HashDelToken)
            .IsUnique()
            .HasDatabaseName("ix_solicitudes_hash_del_token");

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

        // Diseño hecho sin cuenta. Las tres columnas son nulas a la vez cuando no hay
        // diseño (o se descartó). Como tipo complejo opcional, EF lo trata como nulo
        // si todas sus columnas lo son.
        constructor.ComplexProperty(solicitud => solicitud.Diseno, diseno =>
        {
            diseno.Property(pendiente => pendiente.Nombre)
                .HasConversion(Conversiones.Nombre)
                .HasColumnName("diseno_nombre")
                .HasMaxLength(NombreDeDiseno.LongitudMaxima);

            diseno.Property(pendiente => pendiente.Tipo)
                .HasConversion(Conversiones.Tipo)
                .HasColumnName("diseno_tipo")
                .HasMaxLength(20);

            diseno.Property(pendiente => pendiente.Contenido)
                .HasConversion(Conversiones.Contenido)
                .HasColumnName("diseno_contenido")
                .HasColumnType("jsonb");
        });
    }
}
