namespace Decorazon.Dominio.Disenos;

public enum TipoDeEstancia
{
    Dormitorio,
    Salon,
    Cocina,
    Despacho,
    Bano,
}

/// <summary>
/// Paso entre el tipo y el texto que viaja por la API. El texto es exacto y en
/// minúsculas sin tildes (<c>salon</c>, no <c>Salón</c>): así el contrato no
/// depende de la cultura ni del nombre interno del enum.
/// </summary>
public static class TiposDeEstancia
{
    public static bool TryDesdeTexto(string? texto, out TipoDeEstancia tipo)
    {
        switch (texto)
        {
            case "dormitorio": tipo = TipoDeEstancia.Dormitorio; return true;
            case "salon": tipo = TipoDeEstancia.Salon; return true;
            case "cocina": tipo = TipoDeEstancia.Cocina; return true;
            case "despacho": tipo = TipoDeEstancia.Despacho; return true;
            case "bano": tipo = TipoDeEstancia.Bano; return true;
            default: tipo = default; return false;
        }
    }

    public static string ATexto(TipoDeEstancia tipo) => tipo switch
    {
        TipoDeEstancia.Dormitorio => "dormitorio",
        TipoDeEstancia.Salon => "salon",
        TipoDeEstancia.Cocina => "cocina",
        TipoDeEstancia.Despacho => "despacho",
        TipoDeEstancia.Bano => "bano",
        _ => throw new ArgumentOutOfRangeException(nameof(tipo), tipo, null),
    };
}
