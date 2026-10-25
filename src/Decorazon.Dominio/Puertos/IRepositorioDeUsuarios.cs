using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Puertos;

public interface IRepositorioDeUsuarios
{
    Task<Usuario?> BuscarPorCorreoAsync(CorreoElectronico correo, CancellationToken cancelacion = default);

    Task<Usuario?> BuscarPorIdAsync(Guid id, CancellationToken cancelacion = default);

    /// <summary>
    /// La versión de credenciales de un usuario, sin traer el resto de la fila.
    /// Se llama en cada petición autenticada de la API, así que trae solo la
    /// columna que hace falta para decidir si el JWT sigue valiendo.
    /// </summary>
    /// <returns><c>null</c> si el usuario ya no existe.</returns>
    Task<int?> ObtenerVersionDeCredencialesAsync(Guid id, CancellationToken cancelacion = default);

    Task<bool> ExisteConCorreoAsync(CorreoElectronico correo, CancellationToken cancelacion = default);

    Task AnadirAsync(Usuario usuario, CancellationToken cancelacion = default);

    /// <summary>Persiste los cambios sobre un usuario ya existente.</summary>
    Task ActualizarAsync(Usuario usuario, CancellationToken cancelacion = default);
}
