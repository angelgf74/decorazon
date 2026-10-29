using Decorazon.Aplicacion.Disenos;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Registro;

/// <summary>
/// Paso 1 del alta: alguien pide cuenta para un correo, opcionalmente con el
/// diseño que acaba de hacer sin cuenta.
/// </summary>
/// <remarks>
/// Que el correo ya tenga cuenta <b>no</b> cambia la respuesta: si lo hiciera,
/// este endpoint sería un comprobador de qué direcciones están registradas.
/// Por eso un correo con cuenta también deja una solicitud (inutilizable) que cuenta para el
/// límite de solicitudes por hora: si no, el límite respondería distinto según haya cuenta o no.
/// </remarks>
public sealed class SolicitarRegistro(
    IRepositorioDeUsuarios usuarios,
    IRepositorioDeSolicitudesDeRegistro solicitudes,
    IGeneradorDeTokens generadorDeTokens,
    IEnviadorDeCorreo enviadorDeCorreo,
    IReloj reloj)
{
    public const int MaximoDeSolicitudesPorHora = 3;

    private const string NombrePorDefecto = "Mi diseño";

    public async Task<ResultadoDeSolicitud> EjecutarAsync(
        string correoIndicado,
        PeticionDeDiseno? disenoIndicado,
        Func<string, string> construirEnlace,
        CancellationToken cancelacion = default)
    {
        if (!CorreoElectronico.TryCrear(correoIndicado, out var correo))
        {
            return ResultadoDeSolicitud.CorreoInvalido;
        }

        DisenoPendiente? diseno = null;

        if (disenoIndicado is not null)
        {
            // Sin nombre, el diseño no se rechaza: la persona aún no lo ha guardado
            // en ningún sitio y no tiene por qué haberle puesto uno.
            var peticion = string.IsNullOrWhiteSpace(disenoIndicado.Nombre)
                ? disenoIndicado with { Nombre = NombrePorDefecto }
                : disenoIndicado;

            var conversion = peticion.Convertir();

            if (!conversion.EsValida)
            {
                return ResultadoDeSolicitud.DisenoNoValido;
            }

            diseno = new DisenoPendiente(conversion.Nombre!, conversion.Tipo, conversion.Contenido!);
        }

        var ahora = reloj.Ahora;

        // El límite va antes de comprobar si hay cuenta: así tampoco depende de ello.
        if (await solicitudes.ContarCreadasDesdeAsync(correo, ahora.AddHours(-1), cancelacion) >= MaximoDeSolicitudesPorHora)
        {
            return ResultadoDeSolicitud.DemasiadasSolicitudes;
        }

        if (await usuarios.ExisteConCorreoAsync(correo, cancelacion))
        {
            // Se registra una solicitud sin diseño, con un token que nunca se envía, y se
            // invalida al instante: no sirve para nada, pero cuenta para el límite por hora
            // igual que la de un correo nuevo. Sin ella, un correo con cuenta nunca llegaría
            // al límite y se podría distinguir de uno nuevo (y spamear al dueño con avisos).
            var descartada = SolicitudDeRegistro.Crear(
                correo, generadorDeTokens.Hashear(generadorDeTokens.GenerarToken()), null, ahora);
            descartada.Invalidar(ahora);
            await solicitudes.AnadirAsync(descartada, cancelacion);
            await solicitudes.GuardarCambiosAsync(cancelacion);

            // El dueño del buzón se entera del intento; quien lo hizo, no. Si el correo no
            // sale, la respuesta es la misma que con un correo nuevo: tampoco delata nada.
            return await EnviarAsync(() => enviadorDeCorreo.EnviarAvisoDeCuentaExistenteAsync(correo, cancelacion));
        }

        // Pedir el alta otra vez invalida los enlaces anteriores (y su diseño): solo el último sirve.
        foreach (var anterior in await solicitudes.BuscarVivasPorCorreoAsync(correo, cancelacion))
        {
            anterior.Invalidar(ahora);
        }

        var token = generadorDeTokens.GenerarToken();
        var solicitud = SolicitudDeRegistro.Crear(correo, generadorDeTokens.Hashear(token), diseno, ahora);

        await solicitudes.AnadirAsync(solicitud, cancelacion);
        await solicitudes.GuardarCambiosAsync(cancelacion);

        // El envío va dentro del caso de uso a propósito: si Brevo falla, el usuario
        // debe enterarse ahora, no quedarse esperando un correo que nunca llega.
        return await EnviarAsync(() => enviadorDeCorreo.EnviarEnlaceDeAltaAsync(correo, construirEnlace(token), cancelacion));
    }

    private static async Task<ResultadoDeSolicitud> EnviarAsync(Func<Task> envio)
    {
        try
        {
            await envio();
            return ResultadoDeSolicitud.Aceptada;
        }
        catch (CorreoNoEnviadoException)
        {
            // La solicitud ya está guardada y cuenta para el límite: reintentar luego es
            // pedir otra, que invalida esta.
            return ResultadoDeSolicitud.CorreoNoEnviado;
        }
    }
}

public enum ResultadoDeSolicitud
{
    /// <summary>Solicitud admitida. No dice si se creó una cuenta nueva o el correo ya existía.</summary>
    Aceptada,

    CorreoInvalido,

    /// <summary>El diseño adjunto no cumple las reglas del dominio.</summary>
    DisenoNoValido,

    /// <summary>Ese correo ya ha pedido el alta demasiadas veces en la última hora.</summary>
    DemasiadasSolicitudes,

    /// <summary>La solicitud se guardó, pero el proveedor de correo no aceptó el mensaje.</summary>
    CorreoNoEnviado
}
