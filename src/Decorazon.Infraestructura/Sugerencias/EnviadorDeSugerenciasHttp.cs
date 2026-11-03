using System.Net.Http.Json;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Sugerencias;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Decorazon.Infraestructura.Sugerencias;

/// <summary>
/// Entrega por la API del buzón de sugerencias del autor
/// (<c>gestorsugerencias-api.angelgf.com.es</c>, proyecto GestorSugerencias).
/// </summary>
/// <remarks>
/// Su <c>POST api/Sugerencias</c> es anónimo y recibe <c>aplicacion</c>, <c>email</c> (200
/// caracteres como mucho), <c>texto</c> (2000) y <c>tipo</c>. El tipo se manda por nombre: el
/// buzón lo lee con <c>JsonStringEnumConverter</c>, y un nombre resiste a que se reordene su
/// enumerado, cosa que un número no.
/// </remarks>
public sealed class EnviadorDeSugerenciasHttp(
    HttpClient cliente,
    IOptions<OpcionesDeSugerencias> opciones,
    ILogger<EnviadorDeSugerenciasHttp> registro) : IEnviadorDeSugerencias
{
    private readonly OpcionesDeSugerencias _opciones = opciones.Value;

    public async Task EnviarAsync(Sugerencia sugerencia, CancellationToken cancelacion = default)
    {
        var peticion = new
        {
            aplicacion = _opciones.Aplicacion,
            email = sugerencia.Correo.Valor,
            texto = sugerencia.Texto.Valor,
            tipo = TipoEnElBuzon(sugerencia.Tipo)
        };

        HttpResponseMessage respuesta;
        string? detalle = null;
        try
        {
            respuesta = await cliente.PostAsJsonAsync("api/Sugerencias", peticion, cancelacion);

            if (!respuesta.IsSuccessStatusCode)
            {
                detalle = await respuesta.Content.ReadAsStringAsync(cancelacion);
            }
        }
        catch (Exception excepcion) when (
            excepcion is HttpRequestException
            || (excepcion is TaskCanceledException && !cancelacion.IsCancellationRequested))
        {
            // Sin conexión, o el tiempo de espera del HttpClient agotado (llega como una
            // cancelación que nadie pidió). Si quien llama cancela, eso no se disfraza.
            registro.LogError(excepcion, "No se pudo hablar con el buzón de sugerencias.");
            throw new SugerenciaNoEnviadaException("No se pudo contactar con el buzón de sugerencias.", excepcion);
        }

        if (respuesta.IsSuccessStatusCode)
        {
            return;
        }

        // Ni el correo ni el texto van al log: son de quien escribe. El estado y el detalle bastan
        // para saber si el buzón está caído o si ha cambiado su contrato.
        registro.LogError(
            "El buzón de sugerencias rechazó el envío. Estado {Estado}. Detalle: {Detalle}",
            (int)respuesta.StatusCode,
            detalle);

        throw new SugerenciaNoEnviadaException(
            $"No se pudo enviar la sugerencia (el buzón respondió {(int)respuesta.StatusCode}).");
    }

    /// <summary>Los nombres del enumerado <c>TipoSugerencia</c> del buzón.</summary>
    private static string TipoEnElBuzon(TipoDeSugerencia tipo) => tipo switch
    {
        TipoDeSugerencia.Mejora => "Mejora",
        TipoDeSugerencia.Funcionalidad => "NuevaFuncionalidad",
        TipoDeSugerencia.Error => "ErrorReportado",
        TipoDeSugerencia.Pregunta => "PreguntaSoporte",
        TipoDeSugerencia.Otra => "OtraConsulta",
        _ => throw new ArgumentOutOfRangeException(nameof(tipo), tipo, "Tipo de sugerencia sin nombre en el buzón.")
    };
}
