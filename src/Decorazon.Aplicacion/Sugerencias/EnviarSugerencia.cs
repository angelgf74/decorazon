using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Sugerencias;
using Decorazon.Dominio.Usuarios;
using Microsoft.Extensions.Logging;

namespace Decorazon.Aplicacion.Sugerencias;

public enum ResultadoDeSugerencia
{
    Enviada,
    TextoNoValido,
    TipoNoValido,
    CorreoNoValido,

    /// <summary>El correo vale para una cuenta (254) pero no cabe en el buzón (200).</summary>
    CorreoDemasiadoLargo,

    /// <summary>Había sesión, pero la cuenta ya no existe.</summary>
    SesionCerrada,

    /// <summary>El buzón no la ha aceptado. No queda guardada en ningún sitio.</summary>
    NoSePudoEnviar
}

/// <summary>
/// Hace llegar una sugerencia al autor, con o sin cuenta. Con sesión se responde al
/// correo de la cuenta; sin ella, al que escriba quien la manda.
/// </summary>
/// <remarks>
/// Decorazon no guarda la sugerencia: solo la entrega. Por eso un fallo del buzón se
/// devuelve a quien la escribió, en vez de tragárselo como el correo de aviso de un
/// cambio de contraseña: tragárselo la perdería sin que nadie se enterase.
/// </remarks>
public sealed class EnviarSugerencia(
    IRepositorioDeUsuarios usuarios,
    IEnviadorDeSugerencias buzon,
    ILogger<EnviarSugerencia> registro)
{
    /// <param name="usuarioId">El de la sesión, o <c>null</c> sin sesión.</param>
    /// <param name="correoEscrito">
    /// Solo cuenta sin sesión. Con sesión se ignora: la identidad sale del token, nunca de la petición.
    /// </param>
    public async Task<ResultadoDeSugerencia> EjecutarAsync(
        Guid? usuarioId,
        string? correoEscrito,
        string? texto,
        string? tipo,
        CancellationToken cancelacion = default)
    {
        if (!TextoDeSugerencia.TryCrear(texto, out var textoValido))
        {
            return ResultadoDeSugerencia.TextoNoValido;
        }

        if (!TiposDeSugerencia.TryLeer(tipo, out var tipoValido))
        {
            return ResultadoDeSugerencia.TipoNoValido;
        }

        CorreoElectronico correo;
        if (usuarioId is { } id)
        {
            var usuario = await usuarios.BuscarPorIdAsync(id, cancelacion);
            if (usuario is null)
            {
                return ResultadoDeSugerencia.SesionCerrada;
            }

            correo = usuario.Correo;
        }
        else if (!CorreoElectronico.TryCrear(correoEscrito, out correo))
        {
            return ResultadoDeSugerencia.CorreoNoValido;
        }

        if (correo.Valor.Length > Sugerencia.LongitudMaximaDelCorreo)
        {
            return ResultadoDeSugerencia.CorreoDemasiadoLargo;
        }

        try
        {
            await buzon.EnviarAsync(new Sugerencia(correo, textoValido, tipoValido), cancelacion);
            return ResultadoDeSugerencia.Enviada;
        }
        catch (SugerenciaNoEnviadaException excepcion)
        {
            // El adaptador ya ha registrado el detalle; aquí queda constancia de que se perdió.
            registro.LogWarning(excepcion, "Una sugerencia no ha llegado al buzón; se ha pedido a quien la escribió que la reintente.");
            return ResultadoDeSugerencia.NoSePudoEnviar;
        }
    }
}
