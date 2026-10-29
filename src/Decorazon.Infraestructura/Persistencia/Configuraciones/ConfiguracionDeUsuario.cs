using Decorazon.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Decorazon.Infraestructura.Persistencia.Configuraciones;

public sealed class ConfiguracionDeUsuario : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> constructor)
    {
        constructor.ToTable("usuarios");

        constructor.HasKey(usuario => usuario.Id);

        constructor.Property(usuario => usuario.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        // El objeto valor se guarda como su texto: la columna es un correo normal,
        // legible con cualquier cliente de base de datos.
        constructor.Property(usuario => usuario.Correo)
            .HasConversion(
                correo => correo.Valor,
                valor => CorreoElectronico.Crear(valor))
            .HasColumnName("correo")
            .HasMaxLength(CorreoElectronico.LongitudMaxima)
            .IsRequired();

        // Última línea de defensa contra dos altas simultáneas del mismo correo:
        // la comprobación previa en el caso de uso cubre el caso normal, este cubre la carrera.
        constructor.HasIndex(usuario => usuario.Correo)
            .IsUnique()
            .HasDatabaseName("ix_usuarios_correo");

        constructor.Property(usuario => usuario.Nombre)
            .HasConversion(
                nombre => nombre.Valor,
                valor => NombreDeUsuario.Crear(valor))
            .HasColumnName("nombre")
            .HasMaxLength(NombreDeUsuario.LongitudMaxima)
            .IsRequired();

        constructor.Property(usuario => usuario.HashDeContrasena)
            .HasColumnName("hash_de_contrasena")
            .HasMaxLength(256)
            .IsRequired();

        constructor.Property(usuario => usuario.FechaDeAlta)
            .HasColumnName("fecha_de_alta")
            .IsRequired();

        // Nula mientras nadie la haya cambiado desde el alta.
        constructor.Property(usuario => usuario.FechaDeCambioDeContrasena)
            .HasColumnName("fecha_de_cambio_de_contrasena");

        // Empieza en 1, nunca en 0: así un JWT sin este claim nunca coincide por accidente.
        // Token de concurrencia: dos cambios de credenciales sobre la misma versión leída no
        // pueden ganar los dos; el UPDATE del segundo no encuentra la fila y el adaptador lo
        // traduce a "no guardado".
        constructor.Property(usuario => usuario.VersionDeCredenciales)
            .HasColumnName("version_de_credenciales")
            .IsConcurrencyToken()
            .IsRequired();
    }
}
