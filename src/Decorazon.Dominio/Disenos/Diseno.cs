namespace Decorazon.Dominio.Disenos;

/// <summary>
/// Un diseño de estancia de un usuario. <see cref="Version"/> sube con cada
/// cambio para que la API detecte ediciones simultáneas desde dos pestañas.
/// </summary>
public sealed class Diseno
{
    public const int MaximoPorUsuario = 100;

    private const string SufijoDeCopia = " (copia)";

    // Para EF Core.
    private Diseno()
    {
        Nombre = null!;
        Contenido = null!;
    }

    private Diseno(Guid id, Guid usuarioId, NombreDeDiseno nombre, TipoDeEstancia tipo, ContenidoDeDiseno contenido, DateTimeOffset ahora)
    {
        Id = id;
        UsuarioId = usuarioId;
        Nombre = nombre;
        Tipo = tipo;
        Contenido = contenido;
        FechaDeCreacion = ahora;
        FechaDeModificacion = ahora;
        Version = 1;
    }

    public Guid Id { get; private set; }
    public Guid UsuarioId { get; private set; }
    public NombreDeDiseno Nombre { get; private set; }
    public TipoDeEstancia Tipo { get; private set; }
    public ContenidoDeDiseno Contenido { get; private set; }
    public DateTimeOffset FechaDeCreacion { get; private set; }
    public DateTimeOffset FechaDeModificacion { get; private set; }
    public int Version { get; private set; }

    public static Diseno Crear(Guid usuarioId, NombreDeDiseno nombre, TipoDeEstancia tipo, ContenidoDeDiseno contenido, DateTimeOffset ahora) =>
        new(Guid.NewGuid(), usuarioId, nombre, tipo, contenido, ahora);

    /// <summary>Con el id que ya le dio el cliente, para que reintentar el alta no lo duplique.</summary>
    public static Diseno Crear(Guid id, Guid usuarioId, NombreDeDiseno nombre, TipoDeEstancia tipo, ContenidoDeDiseno contenido, DateTimeOffset ahora) =>
        new(id, usuarioId, nombre, tipo, contenido, ahora);

    public void Actualizar(NombreDeDiseno nombre, TipoDeEstancia tipo, ContenidoDeDiseno contenido, DateTimeOffset ahora)
    {
        Nombre = nombre;
        Tipo = tipo;
        Contenido = contenido;
        FechaDeModificacion = ahora;
        Version++;
    }

    public Diseno Duplicar(DateTimeOffset ahora)
    {
        // Se recorta la base, no el sufijo: la copia debe seguir distinguiéndose.
        var baseDelNombre = Nombre.Valor.Length + SufijoDeCopia.Length > NombreDeDiseno.LongitudMaxima
            ? RecortarSinPartirPares(Nombre.Valor, NombreDeDiseno.LongitudMaxima - SufijoDeCopia.Length)
            : Nombre.Valor;

        NombreDeDiseno.TryCrear(baseDelNombre + SufijoDeCopia, out var nombre);
        return new Diseno(Guid.NewGuid(), UsuarioId, nombre, Tipo, Contenido, ahora);
    }

    private static string RecortarSinPartirPares(string texto, int longitud) =>
        char.IsHighSurrogate(texto[longitud - 1]) ? texto[..(longitud - 1)] : texto[..longitud];
}
