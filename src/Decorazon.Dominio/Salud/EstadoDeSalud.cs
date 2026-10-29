namespace Decorazon.Dominio.Salud;

/// <summary>
/// Estado de las dependencias que el sistema necesita para operar.
/// </summary>
public sealed record EstadoDeSalud(bool BaseDeDatos)
{
    public bool EsCorrecto => BaseDeDatos;
}
