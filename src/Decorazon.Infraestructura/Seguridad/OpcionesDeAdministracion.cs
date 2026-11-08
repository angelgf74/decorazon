using Decorazon.Dominio.Usuarios;

namespace Decorazon.Infraestructura.Seguridad;

/// <summary>
/// Quién administra: una lista de correos en configuración. Sin columna ni
/// cuenta especial: la persona se registra como cualquiera y, si su correo está
/// aquí, su token sale con el claim de administrador.
/// </summary>
public sealed class OpcionesDeAdministracion
{
    public const string Seccion = "Administracion";

    /// <summary>Correos de las cuentas administradoras. Vacía: nadie administra.</summary>
    public string[] Correos { get; set; } = [];

    /// <summary>
    /// Compara como el dominio guarda el correo (recortado y en minúsculas): un
    /// valor escrito con mayúsculas en la configuración sigue valiendo.
    /// </summary>
    public bool EsAdministrador(CorreoElectronico correo) =>
        Correos.Any(c => CorreoElectronico.TryCrear(c, out var candidato) && candidato.Valor == correo.Valor);
}
