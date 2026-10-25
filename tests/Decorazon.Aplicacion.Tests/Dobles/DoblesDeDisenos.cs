using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Puertos;

namespace Decorazon.Aplicacion.Tests.Dobles;

/// <summary>
/// Repositorio de diseños en memoria. Registra lo añadido para poder afirmar
/// sobre ello; los objetos son los mismos que guarda la lista, así que mutarlos
/// ya los "persiste".
/// </summary>
public sealed class RepositorioDeDisenosEnMemoria : IRepositorioDeDisenos
{
    private readonly List<Diseno> _disenos = [];

    public IReadOnlyList<Diseno> Todos => _disenos;

    public Task<Diseno?> ObtenerAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        Task.FromResult(_disenos.FirstOrDefault(diseno => diseno.UsuarioId == usuarioId && diseno.Id == id));

    public Task<IReadOnlyList<Diseno>> ListarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        Task.FromResult<IReadOnlyList<Diseno>>(
            _disenos.Where(diseno => diseno.UsuarioId == usuarioId)
                .OrderByDescending(diseno => diseno.FechaDeModificacion)
                .ToList());

    public Task<int> ContarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        Task.FromResult(_disenos.Count(diseno => diseno.UsuarioId == usuarioId));

    public void Anadir(Diseno diseno) => _disenos.Add(diseno);

    public void Borrar(Diseno diseno) => _disenos.Remove(diseno);

    /// <summary>Cuántas veces se ha pedido guardar.</summary>
    public int GuardadosSolicitados { get; private set; }

    public Task GuardarCambiosAsync(CancellationToken cancelacion = default)
    {
        GuardadosSolicitados++;
        return Task.CompletedTask;
    }
}
