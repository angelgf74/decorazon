namespace Decorazon.Infraestructura.Seguridad;

/// <summary>
/// Nombres de los claims que este proyecto añade al JWT, aparte de los
/// registrados (<c>sub</c>, <c>email</c>, <c>jti</c>). Constante compartida
/// entre quien emite el token (<see cref="EmisorDeAccesoJwt"/>) y quien lo
/// valida (<c>Program.cs</c>), para que no puedan divergir por una errata.
/// </summary>
public static class ClaimsPropios
{
    /// <summary>Ver <see cref="Decorazon.Dominio.Usuarios.Usuario.VersionDeCredenciales"/>.</summary>
    public const string VersionDeCredenciales = "ver_cred";
}
