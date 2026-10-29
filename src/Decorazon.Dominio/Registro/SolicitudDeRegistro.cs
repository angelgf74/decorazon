using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Registro;

/// <summary>
/// Estado intermedio del alta en dos pasos: un correo que ha pedido cuenta
/// y todavía no la ha completado. No es un <see cref="Usuario"/>: mientras
/// vive aquí, ese correo no puede iniciar sesión ni aparece en el producto.
/// </summary>
public sealed class SolicitudDeRegistro
{
    /// <summary>
    /// Ventana de validez del enlace. Corta a propósito: el token viaja en una URL,
    /// que puede acabar en un historial, en un proxy o reenviada a un tercero.
    /// </summary>
    public static readonly TimeSpan Vigencia = TimeSpan.FromHours(24);

    private SolicitudDeRegistro(
        Guid id,
        CorreoElectronico correo,
        string hashDelToken,
        DisenoPendiente? diseno,
        DateTimeOffset fechaDeCreacion,
        DateTimeOffset fechaDeCaducidad)
    {
        Id = id;
        Correo = correo;
        HashDelToken = hashDelToken;
        Diseno = diseno;
        FechaDeCreacion = fechaDeCreacion;
        FechaDeCaducidad = fechaDeCaducidad;
    }

    /// <summary>Constructor para EF Core.</summary>
    private SolicitudDeRegistro()
    {
        Correo = null!;
        HashDelToken = null!;
    }

    public Guid Id { get; private set; }

    public CorreoElectronico Correo { get; private set; }

    /// <summary>Hash del token, nunca el token: quien lea esta tabla no debe poder completar altas ajenas.</summary>
    public string HashDelToken { get; private set; }

    /// <summary>
    /// Diseño hecho sin cuenta, que se guarda al completar el alta. Lo conserva
    /// <see cref="Consumir"/> (lo necesita quien completa el registro); lo quitan
    /// <see cref="Invalidar"/> y <see cref="DescartarDiseno"/>.
    /// </summary>
    public DisenoPendiente? Diseno { get; private set; }

    public DateTimeOffset FechaDeCreacion { get; private set; }

    public DateTimeOffset FechaDeCaducidad { get; private set; }

    /// <summary>Cuándo se usó. <c>null</c> mientras siga sin consumir.</summary>
    public DateTimeOffset? FechaDeConsumo { get; private set; }

    public bool EstaConsumida => FechaDeConsumo is not null;

    public static SolicitudDeRegistro Crear(
        CorreoElectronico correo,
        string hashDelToken,
        DisenoPendiente? diseno,
        DateTimeOffset ahora)
    {
        ArgumentNullException.ThrowIfNull(correo);
        ArgumentException.ThrowIfNullOrWhiteSpace(hashDelToken);

        return new SolicitudDeRegistro(Guid.NewGuid(), correo, hashDelToken, diseno, ahora, ahora.Add(Vigencia));
    }

    public bool EstaVigente(DateTimeOffset ahora) => !EstaConsumida && ahora < FechaDeCaducidad;

    /// <summary>
    /// Marca la solicitud como usada. Devuelve <c>false</c> si ya no era vigente,
    /// de forma que el mismo enlace no pueda crear dos cuentas.
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
    /// Invalida la solicitud sin haberse usado. Se aplica a las anteriores cuando
    /// el mismo correo vuelve a pedir el alta: solo el último enlace debe funcionar.
    /// </summary>
    public void Invalidar(DateTimeOffset ahora)
    {
        if (!EstaConsumida)
        {
            FechaDeCaducidad = ahora;
        }

        // Una solicitud sustituida no debe dejar su diseño guardado.
        Diseno = null;
    }

    /// <summary>
    /// Quita el diseño pendiente sin tocar la vigencia: p. ej. cuando el correo
    /// ya tiene cuenta, o una vez guardado el diseño en la cuenta nueva.
    /// </summary>
    public void DescartarDiseno() => Diseno = null;
}
