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

    /// <summary>
    /// Añade el usuario y <b>guarda</b> la unidad de trabajo. En producción todos los
    /// repositorios comparten el mismo <c>DbContext</c> (uno por petición), así que este
    /// guardado confirma también lo que otros repositorios hayan rastreado antes
    /// (p. ej. el diseño nuevo y la solicitud consumida de <c>CompletarRegistro</c>):
    /// todo en una sola transacción. Un adaptador que no comparta contexto no da esa garantía.
    /// </summary>
    /// <returns>
    /// <c>false</c> si no se guardó nada: ya existe una cuenta con ese correo (otra alta
    /// simultánea llegó antes) o algo de lo que se guardaba a la vez lo cambió otro
    /// entretanto (p. ej. el enlace ya se consumió).
    /// </returns>
    Task<bool> AnadirAsync(Usuario usuario, CancellationToken cancelacion = default);

    /// <summary>Persiste los cambios sobre un usuario ya existente.</summary>
    /// <returns>
    /// <c>false</c> si no se guardó nada: la cuenta se borró entretanto, o algo de lo que
    /// se guardaba a la vez lo cambió otro (p. ej. el enlace de contraseña ya se consumió).
    /// </returns>
    Task<bool> ActualizarAsync(Usuario usuario, CancellationToken cancelacion = default);
}
