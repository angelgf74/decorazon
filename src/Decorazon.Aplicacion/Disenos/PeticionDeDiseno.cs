using Decorazon.Dominio.Disenos;

namespace Decorazon.Aplicacion.Disenos;

/// <summary>
/// Los datos de un diseño tal como llegan de fuera, todavía sin validar.
/// Lo reutilizan el registro (diseño hecho sin cuenta) y la gestión de diseños.
/// </summary>
public sealed record PeticionDeDiseno(string? Nombre, string? TipoEstancia, string? ContenidoJson)
{
    /// <summary>
    /// Único sitio donde una petición se convierte en tipos del dominio, para que
    /// registro y gestión de diseños rechacen exactamente lo mismo.
    /// </summary>
    public ConversionDeDiseno Convertir()
    {
        if (!NombreDeDiseno.TryCrear(Nombre, out var nombre))
        {
            return ConversionDeDiseno.Rechazada(MotivoDeRechazoDeDiseno.NombreNoValido);
        }

        if (!TiposDeEstancia.TryDesdeTexto(TipoEstancia, out var tipo))
        {
            return ConversionDeDiseno.Rechazada(MotivoDeRechazoDeDiseno.TipoNoValido);
        }

        var resultado = ContenidoDeDiseno.Validar(ContenidoJson, out var contenido);

        return resultado == ResultadoDeContenido.Valido
            ? ConversionDeDiseno.Correcta(nombre, tipo, contenido!)
            : ConversionDeDiseno.Rechazada(MotivoDeRechazoDeDiseno.ContenidoNoValido, resultado);
    }
}

public enum MotivoDeRechazoDeDiseno
{
    NombreNoValido,
    TipoNoValido,
    ContenidoNoValido
}

/// <summary>Resultado de <see cref="PeticionDeDiseno.Convertir"/>: o los tres valores del dominio, o el motivo.</summary>
public sealed record ConversionDeDiseno
{
    private ConversionDeDiseno()
    {
    }

    public bool EsValida { get; private init; }

    public NombreDeDiseno? Nombre { get; private init; }

    public TipoDeEstancia Tipo { get; private init; }

    public ContenidoDeDiseno? Contenido { get; private init; }

    public MotivoDeRechazoDeDiseno? Motivo { get; private init; }

    /// <summary>Solo con <see cref="MotivoDeRechazoDeDiseno.ContenidoNoValido"/>: qué falló exactamente.</summary>
    public ResultadoDeContenido? DetalleDelContenido { get; private init; }

    internal static ConversionDeDiseno Correcta(NombreDeDiseno nombre, TipoDeEstancia tipo, ContenidoDeDiseno contenido) =>
        new() { EsValida = true, Nombre = nombre, Tipo = tipo, Contenido = contenido };

    internal static ConversionDeDiseno Rechazada(MotivoDeRechazoDeDiseno motivo, ResultadoDeContenido? detalle = null) =>
        new() { Motivo = motivo, DetalleDelContenido = detalle };
}
