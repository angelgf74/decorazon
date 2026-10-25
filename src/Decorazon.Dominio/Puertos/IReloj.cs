namespace Decorazon.Dominio.Puertos;

/// <summary>
/// El tiempo, como puerto. La caducidad de los tokens es una regla de negocio,
/// y sin poder controlarlo habría que dormir el hilo para probarla.
/// Siempre en UTC: mezclar husos produce caducidades erráticas.
/// </summary>
public interface IReloj
{
    DateTimeOffset Ahora { get; }
}
