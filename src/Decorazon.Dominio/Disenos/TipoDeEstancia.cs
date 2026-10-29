namespace Decorazon.Dominio.Disenos;

public enum TipoDeEstancia
{
    Dormitorio,
    Salon,
    Cocina,
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
            default: tipo = default; return false;
        }
    }

    public static string ATexto(TipoDeEstancia tipo) => tipo switch
    {
        TipoDeEstancia.Dormitorio => "dormitorio",
        TipoDeEstancia.Salon => "salon",
        TipoDeEstancia.Cocina => "cocina",
        _ => throw new ArgumentOutOfRangeException(nameof(tipo), tipo, null),
    };
}
