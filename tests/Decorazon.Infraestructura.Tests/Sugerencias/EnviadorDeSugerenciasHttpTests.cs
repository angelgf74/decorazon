using System.Net;
using System.Text.Json;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Sugerencias;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Sugerencias;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Decorazon.Infraestructura.Tests.Sugerencias;

/// <summary>
/// El adaptador habla el contrato del buzón de sugerencias (<c>POST api/Sugerencias</c>) y
/// traduce cualquier fallo a <see cref="SugerenciaNoEnviadaException"/>, el contrato del puerto.
/// </summary>
public class EnviadorDeSugerenciasHttpTests
{
    private static readonly Sugerencia UnaSugerencia = new(
        CorreoElectronico.Crear("ana@example.com"),
        Texto("Que se pueda girar en 3D"),
        TipoDeSugerencia.Funcionalidad);

    [Fact]
    public async Task Manda_la_sugerencia_al_buzon_con_el_nombre_de_la_aplicacion()
    {
        HttpRequestMessage? recibida = null;
        string? cuerpo = null;
        var enviador = Enviador(async peticion =>
        {
            recibida = peticion;
            cuerpo = await peticion.Content!.ReadAsStringAsync();
            // El buzón responde 201 con la sugerencia creada, aunque su OpenAPI diga 200.
            return new HttpResponseMessage(HttpStatusCode.Created) { Content = new StringContent("{}") };
        });

        await enviador.EnviarAsync(UnaSugerencia);

        Assert.Equal(HttpMethod.Post, recibida!.Method);
        Assert.Equal("https://buzon.test/api/Sugerencias", recibida.RequestUri!.ToString());
        using var json = JsonDocument.Parse(cuerpo!);
        Assert.Equal("Decorazon", json.RootElement.GetProperty("aplicacion").GetString());
        Assert.Equal("ana@example.com", json.RootElement.GetProperty("email").GetString());
        Assert.Equal("Que se pueda girar en 3D", json.RootElement.GetProperty("texto").GetString());
        Assert.Equal("NuevaFuncionalidad", json.RootElement.GetProperty("tipo").GetString());
    }

    /// <summary>
    /// El tipo viaja por nombre, no por número: si el buzón reordena su enumerado, un número
    /// cambiaría de significado sin avisar; un nombre que ya no existe da un 400 que se ve.
    /// </summary>
    [Theory]
    [InlineData(TipoDeSugerencia.Mejora, "Mejora")]
    [InlineData(TipoDeSugerencia.Funcionalidad, "NuevaFuncionalidad")]
    [InlineData(TipoDeSugerencia.Error, "ErrorReportado")]
    [InlineData(TipoDeSugerencia.Pregunta, "PreguntaSoporte")]
    [InlineData(TipoDeSugerencia.Otra, "OtraConsulta")]
    public async Task Cada_tipo_viaja_con_el_nombre_del_buzon(TipoDeSugerencia tipo, string esperado)
    {
        string? cuerpo = null;
        var enviador = Enviador(async peticion =>
        {
            cuerpo = await peticion.Content!.ReadAsStringAsync();
            return new HttpResponseMessage(HttpStatusCode.Created);
        });

        await enviador.EnviarAsync(UnaSugerencia with { Tipo = tipo });

        using var json = JsonDocument.Parse(cuerpo!);
        Assert.Equal(esperado, json.RootElement.GetProperty("tipo").GetString());
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.NotFound)]
    public async Task Una_respuesta_de_error_del_buzon_es_SugerenciaNoEnviada(HttpStatusCode estado)
    {
        var enviador = Enviador(_ => Task.FromResult(new HttpResponseMessage(estado) { Content = new StringContent("{}") }));

        await Assert.ThrowsAsync<SugerenciaNoEnviadaException>(() => enviador.EnviarAsync(UnaSugerencia));
    }

    [Fact]
    public async Task Sin_conexion_con_el_buzon_es_SugerenciaNoEnviada()
    {
        var enviador = Enviador(_ => throw new HttpRequestException("sin red"));

        await Assert.ThrowsAsync<SugerenciaNoEnviadaException>(() => enviador.EnviarAsync(UnaSugerencia));
    }

    [Fact]
    public async Task Si_el_buzon_no_responde_a_tiempo_es_SugerenciaNoEnviada()
    {
        var enviador = Enviador(_ => throw new TaskCanceledException("timeout del HttpClient"));

        await Assert.ThrowsAsync<SugerenciaNoEnviadaException>(() => enviador.EnviarAsync(UnaSugerencia));
    }

    [Fact]
    public async Task Si_quien_llama_cancela_la_cancelacion_no_se_disfraza()
    {
        using var cancelacion = new CancellationTokenSource();
        await cancelacion.CancelAsync();
        var enviador = Enviador(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.Created)));

        var excepcion = await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            enviador.EnviarAsync(UnaSugerencia, cancelacion.Token));
        Assert.IsNotType<SugerenciaNoEnviadaException>(excepcion);
    }

    private static TextoDeSugerencia Texto(string valor) =>
        TextoDeSugerencia.TryCrear(valor, out var texto) ? texto : throw new ArgumentException(valor);

    private static EnviadorDeSugerenciasHttp Enviador(Func<HttpRequestMessage, Task<HttpResponseMessage>> responder) =>
        new(
            new HttpClient(new ManejadorFalso(responder)) { BaseAddress = new Uri("https://buzon.test/") },
            Options.Create(new OpcionesDeSugerencias { UsarServicioReal = true }),
            NullLogger<EnviadorDeSugerenciasHttp>.Instance);

    private sealed class ManejadorFalso(Func<HttpRequestMessage, Task<HttpResponseMessage>> responder) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage peticion, CancellationToken cancelacion)
        {
            cancelacion.ThrowIfCancellationRequested();
            return responder(peticion);
        }
    }
}
