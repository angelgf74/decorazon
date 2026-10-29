using Decorazon.Dominio.Puertos;
using Microsoft.Extensions.Logging;

namespace Decorazon.Aplicacion.Cuentas;

public enum ResultadoDeBaja
{
    Correcto,

    /// <summary>
    /// Usuario inexistente o contraseña equivocada: no se distinguen. No se ha
    /// borrado nada.
    /// </summary>
    CredencialesIncorrectas
}

/// <summary>
/// Borra la cuenta entera: el usuario y todos sus diseños.
/// </summary>
/// <remarks>
/// El correo de confirmación va <b>después</b> del borrado, que es una sola
/// transacción: avisar de una baja que luego falla sería peor que no avisar. Y
/// un correo que falla no deshace la baja.
/// </remarks>
public sealed class BorrarCuenta(
    IRepositorioDeUsuarios usuarios,
    IBorradoDeCuentas borrado,
    IHasheadorDeContrasenas hasheador,
    IEnviadorDeCorreo enviadorDeCorreo,
    ILogger<BorrarCuenta> registro)
{
    public async Task<ResultadoDeBaja> EjecutarAsync(
        Guid usuarioId,
        string contrasena,
        CancellationToken cancelacion = default)
    {
        var usuario = await usuarios.BuscarPorIdAsync(usuarioId, cancelacion);

        // Tener la sesión abierta no basta: esto no se puede deshacer, y un
        // teléfono desbloqueado un momento no debe bastar para vaciar una cuenta.
        if (usuario is null || !hasheador.Verificar(contrasena, usuario.HashDeContrasena))
        {
            return ResultadoDeBaja.CredencialesIncorrectas;
        }

        await borrado.BorrarAsync(usuarioId, usuario.Correo, cancelacion);

        try
        {
            // Sin el token de la petición: la baja ya está hecha y es irreversible, así que
            // su confirmación sale aunque quien la pidió cierre la pestaña o se corte.
            await enviadorDeCorreo.EnviarConfirmacionDeBajaAsync(usuario.Correo, CancellationToken.None);
        }
        catch (Exception excepcion)
        {
            // La cuenta ya no existe. Devolver un error haría creer que no se
            // borró, y no hay nada que reintentar.
            registro.LogError(excepcion, "No se pudo confirmar por correo una baja ya hecha.");
        }

        return ResultadoDeBaja.Correcto;
    }
}
