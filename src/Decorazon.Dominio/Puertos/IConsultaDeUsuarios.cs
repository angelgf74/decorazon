using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Puertos;

/// <summary>
/// Vista de conjunto de las cuentas, para quien administra. Separada del
/// repositorio: no es una operación sobre un usuario sino una lectura agregada
/// sobre todos, y así el repositorio sigue siendo el de las operaciones de uno.
/// </summary>
public interface IConsultaDeUsuarios
{
    /// <summary>Todas las cuentas con su uso, en cualquier orden.</summary>
    Task<IReadOnlyList<UsoDeUsuario>> UsoPorUsuarioAsync(CancellationToken cancelacion = default);
}
