using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Puertos;

/// <summary>
/// Borra una cuenta y todo lo que cuelga de ella.
/// </summary>
/// <remarks>
/// Un puerto aparte y no un método por repositorio: el borrado cruza todas las
/// tablas y tiene que ser una sola transacción. O desaparece todo, o nada.
/// </remarks>
public interface IBorradoDeCuentas
{
    /// <summary>
    /// Borra los diseños del usuario y el propio usuario en una sola transacción,
    /// junto con sus solicitudes de contraseña y de alta.
    /// </summary>
    Task BorrarAsync(Guid usuarioId, CorreoElectronico correo, CancellationToken cancelacion = default);
}
