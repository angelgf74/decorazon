namespace Decorazon.Dominio.Disenos;

/// <summary>
/// La imagen de la vista 3D de un diseño para la tarjeta de su enlace (lo que enseñan WhatsApp y compañía al
/// pegarlo). La hace el navegador del dueño; aquí solo se comprueba que sea un JPEG de tamaño razonable. Una por
/// diseño: subir otra la sustituye.
/// </summary>
public sealed class VistaPrevia
{
    public const int TamanoMaximoEnBytes = 300 * 1024;

    // Para EF Core.
    private VistaPrevia()
    {
        Imagen = null!;
    }

    private VistaPrevia(Guid disenoId, byte[] imagen, DateTimeOffset fecha)
    {
        DisenoId = disenoId;
        Imagen = imagen;
        Fecha = fecha;
    }

    public Guid DisenoId { get; private set; }
    public byte[] Imagen { get; private set; }

    /// <summary>Cuándo se subió: la tarjeta la pone en la dirección de la imagen para que se pida de nuevo al cambiar.</summary>
    public DateTimeOffset Fecha { get; private set; }

    /// <summary>Un JPEG (empieza por FF D8 FF) de como mucho <see cref="TamanoMaximoEnBytes"/>.</summary>
    public static bool EsValida(byte[] imagen) =>
        imagen.Length is > 3 and <= TamanoMaximoEnBytes && imagen[0] == 0xFF && imagen[1] == 0xD8 && imagen[2] == 0xFF;

    public static VistaPrevia Crear(Guid disenoId, byte[] imagen, DateTimeOffset fecha)
    {
        ComprobarImagen(imagen);
        return new VistaPrevia(disenoId, imagen, fecha);
    }

    public void Sustituir(byte[] imagen, DateTimeOffset fecha)
    {
        ComprobarImagen(imagen);
        Imagen = imagen;
        Fecha = fecha;
    }

    private static void ComprobarImagen(byte[] imagen)
    {
        if (!EsValida(imagen))
        {
            throw new ArgumentException($"La vista previa debe ser un JPEG de {TamanoMaximoEnBytes} bytes como mucho.", nameof(imagen));
        }
    }
}
