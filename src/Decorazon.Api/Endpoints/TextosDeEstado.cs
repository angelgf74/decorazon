using Decorazon.Aplicacion.Disenos;
using Decorazon.Dominio.Disenos;

namespace Decorazon.Api.Endpoints;

/// <summary>
/// Traduce los rechazos de un diseño al mensaje que ve el usuario. Un solo
/// sitio para que el alta con diseño y la gestión de diseños digan lo mismo
/// ante el mismo fallo.
/// </summary>
public static class TextosDeEstado
{
    /// <summary>Mensaje para un estado de rechazo de <see cref="GestionDeDisenos"/>.</summary>
    public static string DeRechazo(EstadoDeDiseno estado, ResultadoDeContenido? contenido = null) => estado switch
    {
        EstadoDeDiseno.NombreNoValido =>
            $"Ponle un nombre al diseño, de {NombreDeDiseno.LongitudMaxima} caracteres como mucho.",
        EstadoDeDiseno.TipoNoValido =>
            "El tipo de estancia debe ser dormitorio, salon o cocina.",
        EstadoDeDiseno.ContenidoNoValido => DeContenido(contenido),
        EstadoDeDiseno.LimiteAlcanzado =>
            $"Ya tienes {Diseno.MaximoPorUsuario} diseños, el máximo. Borra alguno para guardar otro.",
        EstadoDeDiseno.NoEncontrado => "Ese diseño no existe.",
        _ => "El diseño no es válido."
    };

    /// <summary>
    /// Qué le pasa al contenido. Concreto a propósito: el contenido lo genera
    /// el editor, no la persona, así que un rechazo casi siempre es un fallo del
    /// cliente, y el mensaje debe ayudar a encontrarlo.
    /// </summary>
    public static string DeContenido(ResultadoDeContenido? resultado) => resultado switch
    {
        ResultadoDeContenido.Vacio => "Falta el contenido del diseño.",
        ResultadoDeContenido.Demasiado =>
            $"El diseño ocupa demasiado: el máximo es {ContenidoDeDiseno.TamanoMaximoEnBytes / (1024 * 1024)} MB.",
        ResultadoDeContenido.NoEsJson => "El contenido del diseño no es un JSON válido.",
        ResultadoDeContenido.NoEsObjeto => "El contenido del diseño debe ser un objeto JSON.",
        ResultadoDeContenido.FormatoNoAdmitido =>
            "Este formato de diseño no se admite. Recarga la página e inténtalo de nuevo.",
        ResultadoDeContenido.FaltanPartes =>
            "Al contenido del diseño le faltan partes: estancia, aberturas, estructura o elementos.",
        _ => "El contenido del diseño no es válido."
    };
}
