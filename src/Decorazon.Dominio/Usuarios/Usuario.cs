namespace Decorazon.Dominio.Usuarios;

/// <summary>
/// Cuenta de usuario. Solo existe con el alta completa: correo verificado,
/// nombre y contraseña puestos. No hay usuarios a medio crear.
/// </summary>
public sealed class Usuario
{
    private Usuario(
        Guid id,
        CorreoElectronico correo,
        NombreDeUsuario nombre,
        string hashDeContrasena,
        DateTimeOffset fechaDeAlta)
    {
        Id = id;
        Correo = correo;
        Nombre = nombre;
        HashDeContrasena = hashDeContrasena;
        FechaDeAlta = fechaDeAlta;

        // Nunca 0: así un JWT sin este claim o con un valor puesto a mano nunca
        // coincide por accidente con una cuenta real.
        VersionDeCredenciales = 1;
    }

    /// <summary>Constructor para EF Core, que materializa sin pasar por la factoría.</summary>
    private Usuario()
    {
        Correo = null!;
        Nombre = null!;
        HashDeContrasena = null!;
    }

    public Guid Id { get; private set; }

    public CorreoElectronico Correo { get; private set; }

    public NombreDeUsuario Nombre { get; private set; }

    /// <summary>Resultado de derivar la contraseña. Nunca la contraseña en claro.</summary>
    public string HashDeContrasena { get; private set; }

    public DateTimeOffset FechaDeAlta { get; private set; }

    /// <summary>Cuándo se cambió la contraseña por última vez. <c>null</c> si nunca.</summary>
    public DateTimeOffset? FechaDeCambioDeContrasena { get; private set; }

    /// <summary>
    /// Se compara contra el claim del mismo nombre en cada JWT: si no coincide,
    /// la petición se rechaza aunque la firma y la caducidad sean válidas. Sube
    /// en <see cref="CambiarContrasena"/> y en <see cref="InvalidarSesiones"/>,
    /// los dos únicos sitios que "cierran sesiones" en este dominio.
    /// </summary>
    public int VersionDeCredenciales { get; private set; }

    /// <summary>
    /// Sustituye la contraseña. La invocan tanto el restablecimiento por correo
    /// como el cambio con sesión iniciada: comparten este único método, así que
    /// cualquier cosa que haga se cubre en los dos sitios.
    /// </summary>
    /// <remarks>
    /// Recibe el hash ya calculado: el dominio no sabe derivar contraseñas, eso
    /// es cosa del puerto <c>IHasheadorDeContrasenas</c>.
    /// <para>
    /// Cambiarla <b>invalida las sesiones abiertas</b>: sube
    /// <see cref="VersionDeCredenciales"/>, así que cualquier JWT emitido antes
    /// deja de valer en la siguiente petición que haga.
    /// </para>
    /// </remarks>
    public void CambiarContrasena(string hashDeContrasena, DateTimeOffset ahora)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(hashDeContrasena);

        HashDeContrasena = hashDeContrasena;
        FechaDeCambioDeContrasena = ahora;
        VersionDeCredenciales++;
    }

    /// <summary>
    /// Cierra todas las sesiones abiertas sin tocar la contraseña: el botón
    /// "Cerrar todas las sesiones", para cuando se sospecha que otro dispositivo
    /// sigue con la sesión abierta.
    /// </summary>
    public void InvalidarSesiones() => VersionDeCredenciales++;

    public static Usuario Crear(
        CorreoElectronico correo,
        NombreDeUsuario nombre,
        string hashDeContrasena,
        DateTimeOffset ahora)
    {
        ArgumentNullException.ThrowIfNull(correo);
        ArgumentNullException.ThrowIfNull(nombre);
        ArgumentException.ThrowIfNullOrWhiteSpace(hashDeContrasena);

        return new Usuario(Guid.NewGuid(), correo, nombre, hashDeContrasena, ahora);
    }
}
