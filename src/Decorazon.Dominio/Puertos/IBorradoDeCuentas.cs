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
    /// Borra el usuario y sus solicitudes de contraseña y de alta. Los diseños
    /// se suman a esto cuando exista su borrado.
    /// </summary>
    Task BorrarAsync(Guid usuarioId, CorreoElectronico correo, CancellationToken cancelacion = default);
}
