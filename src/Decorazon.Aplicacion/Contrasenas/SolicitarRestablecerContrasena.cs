using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Contrasenas;

/// <summary>
/// Paso 1 del restablecimiento: alguien dice haber olvidado la contraseña de un correo.
/// </summary>
/// <remarks>
/// Solo distingue entre "correo con formato inválido" y "solicitud aceptada". Que
/// la dirección tenga cuenta o no <b>no</b> cambia la respuesta: si lo hiciera,
/// este endpoint sería un comprobador de qué direcciones están registradas.
/// <para>
/// A diferencia del alta, a un correo sin cuenta no se le envía nada. Allí el aviso
/// es útil ("alguien intentó registrarse con tu dirección"); aquí sería ruido para
/// alguien que no tiene cuenta.
/// </para>
/// </remarks>
public sealed class SolicitarRestablecerContrasena(
    IRepositorioDeUsuarios usuarios,
    IRepositorioDeSolicitudesDeContrasena solicitudes,
    IGeneradorDeTokens generadorDeTokens,
    IEnviadorDeCorreo enviadorDeCorreo,
    IReloj reloj)
{
    public async Task<ResultadoDeSolicitudDeContrasena> EjecutarAsync(
        string correoIndicado,
        Func<string, string> construirEnlace,
        CancellationToken cancelacion = default)
    {
        if (!CorreoElectronico.TryCrear(correoIndicado, out var correo))
        {
            return ResultadoDeSolicitudDeContrasena.CorreoInvalido;
        }

        var usuario = await usuarios.BuscarPorCorreoAsync(correo, cancelacion);

        if (usuario is null)
        {
            // Sin cuenta no hay nada que restablecer, y quien lo pidió recibe la
            // misma respuesta que si la hubiera. Un alta a medias tampoco cuenta:
            // hasta completarla no existe un Usuario, así que cae por aquí.
            return ResultadoDeSolicitudDeContrasena.Aceptada;
        }

        var ahora = reloj.Ahora;

        // Pedirlo otra vez invalida los enlaces anteriores: solo el último sirve.
        foreach (var anterior in await solicitudes.BuscarVivasPorUsuarioAsync(usuario.Id, cancelacion))
        {
            anterior.Invalidar(ahora);
        }

        var token = generadorDeTokens.GenerarToken();
        var solicitud = SolicitudDeContrasena.Crear(usuario.Id, generadorDeTokens.Hashear(token), ahora);

        await solicitudes.AnadirAsync(solicitud, cancelacion);

        // El envío va dentro del caso de uso a propósito: si Brevo falla, el usuario
        // debe enterarse ahora, no quedarse esperando un correo que nunca llega.
        await enviadorDeCorreo.EnviarEnlaceDeContrasenaAsync(correo, construirEnlace(token), cancelacion);

        return ResultadoDeSolicitudDeContrasena.Aceptada;
    }
}

public enum ResultadoDeSolicitudDeContrasena
{
    /// <summary>Solicitud admitida. No dice si el correo tenía cuenta.</summary>
    Aceptada,

    CorreoInvalido
}
