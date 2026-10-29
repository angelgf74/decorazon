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

    public async Task<bool> AnadirAsync(Usuario usuario, CancellationToken cancelacion = default)
    {
        await contexto.Usuarios.AddAsync(usuario, cancelacion);

        try
        {
            await contexto.SaveChangesAsync(cancelacion);
            return true;
        }
        catch (Exception excepcion) when (
            excepcion is DbUpdateConcurrencyException
            || (excepcion is DbUpdateException insercion && ErroresDePostgres.EsUnicidadViolada(insercion)))
        {
            // 23505: otra alta del mismo correo llegó antes (el índice único de usuarios).
            // Concurrencia: el enlace que se consume en este mismo guardado ya lo usó otro.
            // Nada se ha escrito; se olvida lo rastreado, que ya no dice la verdad.
            contexto.ChangeTracker.Clear();
            return false;
        }
    }

    public async Task<bool> ActualizarAsync(Usuario usuario, CancellationToken cancelacion = default)
    {
        // El usuario ya lo rastrea el contexto; basta con volcar los cambios.
        try
        {
            await contexto.SaveChangesAsync(cancelacion);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            // La cuenta se borró entretanto (el UPDATE no encontró la fila), o el enlace
            // que se consume en este mismo guardado ya lo usó otro.
            contexto.ChangeTracker.Clear();
            return false;
        }
    }
}
