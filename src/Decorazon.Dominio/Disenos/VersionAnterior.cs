namespace Decorazon.Dominio.Disenos;

/// <summary>
/// La copia de un diseño tal como estaba antes de sobrescribirlo (M-21): una por diseño, para recuperarlo tras un
/// «Sobrescribir con la mía» o un cambio del que uno se arrepiente al día siguiente. No es un historial.
/// </summary>
public sealed class VersionAnterior
{
    /// <summary>
    /// La web guarda cada dos segundos: copiar en cada guardado dejaría la copia de hace un momento. Se copia cuando el
    /// último guardado tiene al menos esto (empieza otra sesión de edición) o cuando la web lo pide al sobrescribir.
    /// </summary>
    public static readonly TimeSpan PausaParaCopiar = TimeSpan.FromMinutes(30);

    // Para EF Core.
    private VersionAnterior()
    {
        Nombre = null!;
        Contenido = null!;
    }

    private VersionAnterior(Diseno diseno)
    {
        DisenoId = diseno.Id;
        Nombre = diseno.Nombre;
        Tipo = diseno.Tipo;
        Contenido = diseno.Contenido;
        Fecha = diseno.FechaDeModificacion;
        Version = diseno.Version;
    }

    public Guid DisenoId { get; private set; }
    public NombreDeDiseno Nombre { get; private set; }
    public TipoDeEstancia Tipo { get; private set; }
    public ContenidoDeDiseno Contenido { get; private set; }

    /// <summary>Cuándo se guardó esa versión (su fecha de modificación de entonces).</summary>
    public DateTimeOffset Fecha { get; private set; }

    /// <summary>La versión que tenía el diseño entonces.</summary>
    public int Version { get; private set; }

    public static VersionAnterior De(Diseno diseno) => new(diseno);

    /// <summary>La copia pasa a ser la del diseño tal como está ahora.</summary>
    public void Sustituir(Diseno diseno)
    {
        if (diseno.Id != DisenoId)
        {
            throw new ArgumentException("La copia es de otro diseño.", nameof(diseno));
        }

        Nombre = diseno.Nombre;
        Tipo = diseno.Tipo;
        Contenido = diseno.Contenido;
        Fecha = diseno.FechaDeModificacion;
        Version = diseno.Version;
    }

    /// <summary>Si toca copiar antes de un guardado: lo pide quien guarda, o hace al menos <see cref="PausaParaCopiar"/> del último.</summary>
    public static bool TocaCopiar(Diseno diseno, DateTimeOffset ahora, bool pedida) =>
        pedida || ahora - diseno.FechaDeModificacion >= PausaParaCopiar;
}
