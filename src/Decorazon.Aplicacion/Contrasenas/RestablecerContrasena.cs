using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Contrasenas;

/// <summary>
/// Paso 2 del restablecimiento: el usuario abre el enlace del correo y elige
/// una contraseña nueva.
/// </summary>
public sealed class RestablecerContrasena(
    IRepositorioDeUsuarios usuarios,
    IRepositorioDeSolicitudesDeContrasena solicitudes,
    IGeneradorDeTokens generadorDeTokens,
    IHasheadorDeContrasenas hasheador,
    IReloj reloj)
{
    public async Task<ResultadoDeRestablecerContrasena> EjecutarAsync(
        string token,
        string contrasenaIndicada,
        CancellationToken cancelacion = default)
    {
        // La contraseña se valida antes de tocar el token: al revés, un error de
        // tecleo quemaría el enlace y obligaría a pedir otro.
        if (!Contrasena.TryCrear(contrasenaIndicada, out var contrasena))
        {
            return ResultadoDeRestablecerContrasena.ContrasenaNoValida;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return ResultadoDeRestablecerContrasena.EnlaceNoValido;
        }

        var solicitud = await solicitudes.BuscarPorHashDelTokenAsync(
            generadorDeTokens.Hashear(token), cancelacion);

        // Inexistente, manipulado, caducado o ya usado comparten respuesta: un
        // mensaje distinto para cada caso permitiría sondear qué tokens existieron.
        if (solicitud is null || !solicitud.Consumir(reloj.Ahora))
        {
            return ResultadoDeRestablecerContrasena.EnlaceNoValido;
        }

        var usuario = await usuarios.BuscarPorIdAsync(solicitud.UsuarioId, cancelacion);

        if (usuario is null)
        {
            // La cuenta se ha borrado entre el envío del correo y ahora. Se
            // persiste el consumo igualmente: el token ya se ha gastado.
            await solicitudes.GuardarCambiosAsync(cancelacion);
            return ResultadoDeRestablecerContrasena.EnlaceNoValido;
        }

        usuario.CambiarContrasena(hasheador.Hashear(contrasena), reloj.Ahora);

        // Con el adaptador de EF ambas entidades viven en el mismo contexto, así
        // que este guardado escribe también el consumo del token, en una sola
        // transacción. La llamada siguiente es explícita para que la atomicidad no
        // dependa de ese detalle del adaptador.
        if (!await usuarios.ActualizarAsync(usuario, cancelacion))
        {
            // El mismo enlace se usó a la vez en otra petición, que llegó antes, o la cuenta
            // se borró entretanto. No se ha cambiado nada.
            return ResultadoDeRestablecerContrasena.EnlaceNoValido;
        }

        await solicitudes.GuardarCambiosAsync(cancelacion);

        return ResultadoDeRestablecerContrasena.Restablecida;
    }
}

public enum ResultadoDeRestablecerContrasena
{
    Restablecida,

    /// <summary>Token inexistente, manipulado, caducado o ya consumido.</summary>
    EnlaceNoValido,

    ContrasenaNoValida
}
