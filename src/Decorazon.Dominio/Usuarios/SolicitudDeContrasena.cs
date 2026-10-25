namespace Decorazon.Dominio.Usuarios;

/// <summary>
/// Petición de restablecimiento de contraseña: un secreto de un solo uso enviado
/// al buzón del usuario.
/// </summary>
/// <remarks>
/// Misma mecánica que <c>SolicitudDeRegistro</c>, pero <b>entidad aparte a
/// propósito</b>. Comparten estructura y no significado: unificarlas con un campo
/// "tipo" obligaría a que cada consulta recordara filtrarlo, y olvidarlo una sola
/// vez permitiría canjear un enlace de alta por un cambio de contraseña ajena.
/// Dos tablas separadas hacen ese error imposible.
/// </remarks>
public sealed class SolicitudDeContrasena
{
    /// <summary>
    /// Ventana de validez: <b>una hora</b>, no las veinticuatro del alta.
    /// </summary>
    /// <remarks>
    /// El enlace de alta solo permite crear una cuenta que todavía no existe.
    /// Este permite tomar el control de una que ya existe, con sus diseños
    /// dentro. A mayor daño posible, menor ventana.
    /// </remarks>
    public static readonly TimeSpan Vigencia = TimeSpan.FromHours(1);

    private SolicitudDeContrasena(
        Guid id,
        Guid usuarioId,
        string hashDelToken,
        DateTimeOffset fechaDeCreacion,
        DateTimeOffset fechaDeCaducidad)
    {
        Id = id;
        UsuarioId = usuarioId;
        HashDelToken = hashDelToken;
        FechaDeCreacion = fechaDeCreacion;
        FechaDeCaducidad = fechaDeCaducidad;
    }

    /// <summary>Constructor para EF Core.</summary>
    private SolicitudDeContrasena() => HashDelToken = null!;

    public Guid Id { get; private set; }

    public Guid UsuarioId { get; private set; }

    /// <summary>Hash del token, nunca el token: quien lea esta tabla no debe poder entrar en cuentas ajenas.</summary>
    public string HashDelToken { get; private set; }

    public DateTimeOffset FechaDeCreacion { get; private set; }

    public DateTimeOffset FechaDeCaducidad { get; private set; }

    public DateTimeOffset? FechaDeConsumo { get; private set; }

    public bool EstaConsumida => FechaDeConsumo is not null;

    public static SolicitudDeContrasena Crear(Guid usuarioId, string hashDelToken, DateTimeOffset ahora)
    {
        if (usuarioId == Guid.Empty)
        {
            throw new ArgumentException("La solicitud necesita un usuario.", nameof(usuarioId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(hashDelToken);

        return new SolicitudDeContrasena(Guid.NewGuid(), usuarioId, hashDelToken, ahora, ahora.Add(Vigencia));
    }

    public bool EstaVigente(DateTimeOffset ahora) => !EstaConsumida && ahora < FechaDeCaducidad;

    /// <summary>
    /// Marca la solicitud como usada. Devuelve <c>false</c> si ya no era vigente,
    /// para que el mismo enlace no pueda cambiar la contraseña dos veces.
    /// </summary>
    public bool Consumir(DateTimeOffset ahora)
    {
        if (!EstaVigente(ahora))
        {
            return false;
        }

        FechaDeConsumo = ahora;
        return true;
    }

    /// <summary>
    /// La invalida sin usarla. Se aplica a las anteriores cuando el mismo usuario
    /// vuelve a pedir el restablecimiento: solo el último enlace debe funcionar.
    /// </summary>
    public void Invalidar(DateTimeOffset ahora)
    {
        if (!EstaConsumida)
        {
            FechaDeCaducidad = ahora;
        }
    }
}
