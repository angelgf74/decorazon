using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Sesiones;

/// <summary>
/// Cambia credenciales por un token de acceso.
/// </summary>
public sealed class IniciarSesion(
    IRepositorioDeUsuarios usuarios,
    IHasheadorDeContrasenas hasheador,
    IEmisorDeAcceso emisorDeAcceso)
{
    public async Task<AccesoEmitido?> EjecutarAsync(
        string correoIndicado,
        string contrasenaIndicada,
        CancellationToken cancelacion = default)
    {
        Usuario? usuario = null;

        if (CorreoElectronico.TryCrear(correoIndicado, out var correo))
        {
            usuario = await usuarios.BuscarPorCorreoAsync(correo, cancelacion);
        }

        // Cuando no hay usuario se verifica igualmente contra un hash señuelo.
        // Sin esto, "correo desconocido" respondería mucho más rápido que
        // "contraseña incorrecta", y el tiempo de respuesta delataría qué
        // direcciones tienen cuenta pese a devolver el mismo error.
        var hashAComprobar = usuario?.HashDeContrasena ?? hasheador.HashSenuelo;
        var contrasenaCorrecta = hasheador.Verificar(contrasenaIndicada ?? string.Empty, hashAComprobar);

        if (usuario is null || !contrasenaCorrecta)
        {
            return null;
        }

        return emisorDeAcceso.Emitir(usuario);
    }
}
