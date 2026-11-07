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

    public Task<IReadOnlyList<ResumenDeDiseno>> ListarResumenesAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        Task.FromResult<IReadOnlyList<ResumenDeDiseno>>(
            _disenos.Where(diseno => diseno.UsuarioId == usuarioId)
                .OrderByDescending(diseno => diseno.FechaDeModificacion)
                .Select(diseno => new ResumenDeDiseno(
                    diseno.Id, diseno.Nombre, diseno.Tipo, diseno.FechaDeCreacion, diseno.FechaDeModificacion, diseno.Version, diseno.EnlaceCompartido,
                    _vistas.TryGetValue(diseno.Id, out var vista) ? vista.Fecha : null))
                .ToList());

    public Task<int> ContarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        Task.FromResult(_disenos.Count(diseno => diseno.UsuarioId == usuarioId));

    public Task<Diseno?> ObtenerCompartidoAsync(string enlace, CancellationToken cancelacion = default) =>
        Task.FromResult(_disenos.FirstOrDefault(diseno => diseno.EnlaceCompartido == enlace));

    public Task<string?> CompartirAsync(Guid usuarioId, Guid id, string enlace, CancellationToken cancelacion = default)
    {
        var diseno = _disenos.FirstOrDefault(d => d.UsuarioId == usuarioId && d.Id == id);
        diseno?.Compartir(enlace);
        return Task.FromResult(diseno?.EnlaceCompartido);
    }

    private readonly Dictionary<Guid, VistaPrevia> _vistas = [];
    private readonly Dictionary<Guid, VersionAnterior> _copias = [];

    public Task<VersionAnterior?> ObtenerVersionAnteriorAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        Task.FromResult(_disenos.Any(d => d.UsuarioId == usuarioId && d.Id == id) && _copias.TryGetValue(id, out var c) ? c : null);

    public Task CopiarVersionAnteriorAsync(Diseno diseno, CancellationToken cancelacion = default)
    {
        if (_copias.TryGetValue(diseno.Id, out var c)) c.Sustituir(diseno);
        else _copias[diseno.Id] = VersionAnterior.De(diseno);
        return Task.CompletedTask;
    }

    public Task<bool> GuardarVistaPreviaAsync(Guid usuarioId, Guid id, byte[] imagen, DateTimeOffset fecha, CancellationToken cancelacion = default)
    {
        if (!_disenos.Any(d => d.UsuarioId == usuarioId && d.Id == id)) return Task.FromResult(false);
        if (_vistas.TryGetValue(id, out var existente)) existente.Sustituir(imagen, fecha);
        else _vistas[id] = VistaPrevia.Crear(id, imagen, fecha);
        return Task.FromResult(true);
    }

    public Task<VistaPrevia?> ObtenerVistaPreviaAsync(string enlace, CancellationToken cancelacion = default)
    {
        var diseno = _disenos.FirstOrDefault(d => d.EnlaceCompartido == enlace);
        return Task.FromResult(diseno is not null && _vistas.TryGetValue(diseno.Id, out var vista) ? vista : null);
    }

    public Task<VistaPrevia?> ObtenerVistaPreviaDelDuenoAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default)
    {
        var esSuyo = _disenos.Any(d => d.UsuarioId == usuarioId && d.Id == id);
        return Task.FromResult(esSuyo && _vistas.TryGetValue(id, out var vista) ? vista : null);
    }

    public Task<bool> DejarDeCompartirAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default)
    {
        var diseno = _disenos.FirstOrDefault(d => d.UsuarioId == usuarioId && d.Id == id);
        diseno?.DejarDeCompartir();
        return Task.FromResult(diseno is not null);
    }

    // Un id ya guardado, de quien sea, no entra: el próximo guardado falla como la clave primaria.
    private bool _idRepetido;

    public void Anadir(Diseno diseno)
    {
        if (_disenos.Any(guardado => guardado.Id == diseno.Id))
        {
            _idRepetido = true;
            return;
        }

        _disenos.Add(diseno);
    }

    public void Borrar(Diseno diseno) => _disenos.Remove(diseno);

    /// <summary>Cuántas veces se ha pedido guardar.</summary>
    public int GuardadosSolicitados { get; private set; }

    /// <summary>
    /// Si se fija, el próximo guardado simula que otro se coló: ejecuta esto (p. ej. quitar
    /// el diseño, como haría un borrado concurrente) y devuelve <c>false</c> sin guardar.
    /// </summary>
    public Action? Carrera { get; set; }

    public Task<bool> GuardarCambiosAsync(CancellationToken cancelacion = default)
    {
        GuardadosSolicitados++;

        if (_idRepetido)
        {
            _idRepetido = false;
            throw new IdentificadorRepetidoException();
        }

        if (Carrera is { } carrera)
        {
            Carrera = null;
            carrera();
            return Task.FromResult(false);
        }

        return Task.FromResult(true);
    }

    /// <summary>Lo que haría un borrado desde otra petición.</summary>
    public void Quitar(Diseno diseno) => _disenos.Remove(diseno);
}
