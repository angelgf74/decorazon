using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

public sealed class RepositorioDeUsuariosEf(DecorazonDbContext contexto) : IRepositorioDeUsuarios
{
    public Task<Usuario?> BuscarPorCorreoAsync(
        CorreoElectronico correo,
        CancellationToken cancelacion = default) =>
        contexto.Usuarios.FirstOrDefaultAsync(usuario => usuario.Correo == correo, cancelacion);

    public Task<Usuario?> BuscarPorIdAsync(Guid id, CancellationToken cancelacion = default) =>
        contexto.Usuarios.FirstOrDefaultAsync(usuario => usuario.Id == id, cancelacion);

    public Task<int?> ObtenerVersionDeCredencialesAsync(Guid id, CancellationToken cancelacion = default) =>
        contexto.Usuarios
            .Where(usuario => usuario.Id == id)
            .Select(usuario => (int?)usuario.VersionDeCredenciales)
            .FirstOrDefaultAsync(cancelacion);

    public Task<bool> ExisteConCorreoAsync(
        CorreoElectronico correo,
        CancellationToken cancelacion = default) =>
        contexto.Usuarios.AnyAsync(usuario => usuario.Correo == correo, cancelacion);

    public async Task AnadirAsync(Usuario usuario, CancellationToken cancelacion = default)
    {
        await contexto.Usuarios.AddAsync(usuario, cancelacion);
        await contexto.SaveChangesAsync(cancelacion);
    }

    public Task ActualizarAsync(Usuario usuario, CancellationToken cancelacion = default) =>
        // El usuario ya lo rastrea el contexto; basta con volcar los cambios.
        contexto.SaveChangesAsync(cancelacion);
}
