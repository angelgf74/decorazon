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
/// Por eso el límite de solicitudes por hora se aplica antes de mirar si hay cuenta.
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
            // El dueño del buzón se entera del intento; quien lo hizo, no. El diseño
            // no se guarda: no hay alta que lo reciba.
            await enviadorDeCorreo.EnviarAvisoDeCuentaExistenteAsync(correo, cancelacion);
            return ResultadoDeSolicitud.Aceptada;
        }

        // Pedir el alta otra vez invalida los enlaces anteriores (y su diseño): solo el último sirve.
        foreach (var anterior in await solicitudes.BuscarVivasPorCorreoAsync(correo, cancelacion))
        {
            anterior.Invalidar(ahora);
        }

        var token = generadorDeTokens.GenerarToken();
        var solicitud = SolicitudDeRegistro.Crear(correo, generadorDeTokens.Hashear(token), diseno, ahora);

        await solicitudes.AnadirAsync(solicitud, cancelacion);

        // El envío va dentro del caso de uso a propósito: si Brevo falla, el usuario
        // debe enterarse ahora, no quedarse esperando un correo que nunca llega.
        await enviadorDeCorreo.EnviarEnlaceDeAltaAsync(correo, construirEnlace(token), cancelacion);

        return ResultadoDeSolicitud.Aceptada;
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
    DemasiadasSolicitudes
}
