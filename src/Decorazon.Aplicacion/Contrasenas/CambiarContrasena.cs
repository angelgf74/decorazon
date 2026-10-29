using Microsoft.Extensions.Logging;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Contrasenas;

/// <summary>
/// Resultado de cambiar la contraseña sabiendo la actual.
/// </summary>
/// <remarks>
/// <see cref="CredencialesIncorrectas"/> cubre usuario inexistente y contraseña
/// actual equivocada. Quien pregunta ya tiene un token válido, así que la única
/// respuesta útil en los dos casos es "vuelve a identificarte".
/// </remarks>
public enum ResultadoDeCambioDeContrasena
{
    Correcto,
    CredencialesIncorrectas,
    ContrasenaNoValida
}

/// <summary>
/// Cambia la contraseña de una cuenta con sesión iniciada, sin pasar por el
/// correo. La prueba de que quien pide la operación tiene derecho es la
/// propia contraseña, no un token de un solo uso.
/// </summary>
public sealed class CambiarContrasena(
    IRepositorioDeUsuarios usuarios,
    IHasheadorDeContrasenas hasheador,
    IEnviadorDeCorreo enviadorDeCorreo,
    IReloj reloj,
    ILogger<CambiarContrasena> registro)
{
    public async Task<ResultadoDeCambioDeContrasena> EjecutarAsync(
        Guid usuarioId,
        string contrasenaActual,
        string contrasenaNueva,
        CancellationToken cancelacion = default)
    {
        var usuario = await usuarios.BuscarPorIdAsync(usuarioId, cancelacion);

        if (usuario is null)
        {
            return ResultadoDeCambioDeContrasena.CredencialesIncorrectas;
        }

        // Se comprueba el permiso antes que los datos, al revés que en el
        // restablecimiento por correo: allí la contraseña se valida primero para
        // no quemar un enlace de un solo uso por una errata. Aquí no hay ningún
        // recurso que consumir, así que primero quién eres y luego qué pides.
        if (!hasheador.Verificar(contrasenaActual, usuario.HashDeContrasena))
        {
            return ResultadoDeCambioDeContrasena.CredencialesIncorrectas;
        }

        if (!Contrasena.TryCrear(contrasenaNueva, out var nueva))
        {
            return ResultadoDeCambioDeContrasena.ContrasenaNoValida;
        }

        usuario.CambiarContrasena(hasheador.Hashear(nueva), reloj.Ahora);

        // false: la cuenta se borró entre leerla y guardarla. Igual que si no existiera.
        if (!await usuarios.ActualizarAsync(usuario, cancelacion))
        {
            return ResultadoDeCambioDeContrasena.CredencialesIncorrectas;
        }

        await AvisarAsync(usuario.Correo, cancelacion);

        return ResultadoDeCambioDeContrasena.Correcto;
    }

    /// <summary>
    /// El aviso va <b>después</b> del cambio y su fallo no lo deshace: es una
    /// cortesía de seguridad, no una condición del propio cambio.
    /// </summary>
    private async Task AvisarAsync(CorreoElectronico correo, CancellationToken cancelacion)
    {
        try
        {
            await enviadorDeCorreo.EnviarConfirmacionDeCambioDeContrasenaAsync(correo, cancelacion);
        }
        catch (Exception excepcion) when (excepcion is not OperationCanceledException)
        {
            registro.LogError(excepcion, "No se pudo avisar por correo de un cambio de contraseña ya hecho.");
        }
    }
}
