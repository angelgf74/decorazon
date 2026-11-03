using Decorazon.Aplicacion.Sugerencias;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Sugerencias;
using Decorazon.Dominio.Usuarios;
using Microsoft.Extensions.Logging.Abstractions;

namespace Decorazon.Aplicacion.Tests.Sugerencias;

public class EnviarSugerenciaTests
{
    private readonly RepositorioDeUsuariosEnMemoria _usuarios = new();
    private readonly EnviadorDeSugerenciasEspia _buzon = new();

    private EnviarSugerencia CasoDeUso => new(_usuarios, _buzon, NullLogger<EnviarSugerencia>.Instance);

    [Fact]
    public async Task SinSesion_LlegaConElCorreoEscrito_Normalizado()
    {
        var resultado = await CasoDeUso.EjecutarAsync(null, "  Ana@Ejemplo.com ", "Que se pueda girar en 3D", "funcionalidad");

        Assert.Equal(ResultadoDeSugerencia.Enviada, resultado);
        var enviada = Assert.Single(_buzon.Enviadas);
        Assert.Equal("ana@ejemplo.com", enviada.Correo.Valor);
        Assert.Equal("Que se pueda girar en 3D", enviada.Texto.Valor);
        Assert.Equal(TipoDeSugerencia.Funcionalidad, enviada.Tipo);
    }

    /// <summary>La identidad sale de la sesión: un correo en la petición no cambia a quién se responde.</summary>
    [Fact]
    public async Task ConSesion_LlegaConElCorreoDeLaCuenta_AunqueSeEscribaOtro()
    {
        var usuario = await CuentaAsync("ana@ejemplo.com");

        var resultado = await CasoDeUso.EjecutarAsync(usuario.Id, "otro@ejemplo.com", "Hola", "mejora");

        Assert.Equal(ResultadoDeSugerencia.Enviada, resultado);
        Assert.Equal("ana@ejemplo.com", Assert.Single(_buzon.Enviadas).Correo.Valor);
    }

    [Fact]
    public async Task ConSesion_NoHaceFaltaEscribirCorreo()
    {
        var usuario = await CuentaAsync("ana@ejemplo.com");

        var resultado = await CasoDeUso.EjecutarAsync(usuario.Id, null, "Hola", "mejora");

        Assert.Equal(ResultadoDeSugerencia.Enviada, resultado);
    }

    /// <summary>La cuenta se borró entre validar el token y enviar: no se responde a nadie.</summary>
    [Fact]
    public async Task ConSesionDeUnaCuentaQueYaNoExiste_SesionCerradaYNoSeEnvia()
    {
        var resultado = await CasoDeUso.EjecutarAsync(Guid.NewGuid(), "ana@ejemplo.com", "Hola", "mejora");

        Assert.Equal(ResultadoDeSugerencia.SesionCerrada, resultado);
        Assert.Empty(_buzon.Enviadas);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("no-es-un-correo")]
    public async Task SinSesion_ConUnCorreoQueNoVale_CorreoNoValido(string? correo)
    {
        var resultado = await CasoDeUso.EjecutarAsync(null, correo, "Hola", "mejora");

        Assert.Equal(ResultadoDeSugerencia.CorreoNoValido, resultado);
        Assert.Empty(_buzon.Enviadas);
    }

    /// <summary>Una cuenta admite correos de 254 caracteres y el buzón solo de 200.</summary>
    [Fact]
    public async Task ConUnCorreoMasLargoDeLoQueAdmiteElBuzon_CorreoDemasiadoLargo()
    {
        var largo = new string('a', Sugerencia.LongitudMaximaDelCorreo - "@ejemplo.com".Length + 1) + "@ejemplo.com";
        var usuario = await CuentaAsync(largo);

        Assert.Equal(ResultadoDeSugerencia.CorreoDemasiadoLargo, await CasoDeUso.EjecutarAsync(usuario.Id, null, "Hola", "mejora"));
        Assert.Equal(ResultadoDeSugerencia.CorreoDemasiadoLargo, await CasoDeUso.EjecutarAsync(null, largo, "Hola", "mejora"));
        Assert.Empty(_buzon.Enviadas);
    }

    [Fact]
    public async Task ConUnCorreoJustoEnElLimiteDelBuzon_SeEnvia()
    {
        var justo = new string('a', Sugerencia.LongitudMaximaDelCorreo - "@ejemplo.com".Length) + "@ejemplo.com";

        Assert.Equal(ResultadoDeSugerencia.Enviada, await CasoDeUso.EjecutarAsync(null, justo, "Hola", "mejora"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("Hola\u0000")]
    public async Task ConUnTextoQueNoVale_TextoNoValido(string texto)
    {
        var resultado = await CasoDeUso.EjecutarAsync(null, "ana@ejemplo.com", texto, "mejora");

        Assert.Equal(ResultadoDeSugerencia.TextoNoValido, resultado);
        Assert.Empty(_buzon.Enviadas);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("queja")]
    public async Task ConUnTipoQueNoExiste_TipoNoValido(string? tipo)
    {
        var resultado = await CasoDeUso.EjecutarAsync(null, "ana@ejemplo.com", "Hola", tipo);

        Assert.Equal(ResultadoDeSugerencia.TipoNoValido, resultado);
        Assert.Empty(_buzon.Enviadas);
    }

    /// <summary>
    /// Decorazon no guarda la sugerencia: si el buzón falla y no se dice, se pierde sin
    /// que nadie se entere. El fallo vuelve a quien la escribió para que lo reintente.
    /// </summary>
    [Fact]
    public async Task SiElBuzonFalla_NoSePudoEnviar()
    {
        _buzon.BuzonCaido = true;

        var resultado = await CasoDeUso.EjecutarAsync(null, "ana@ejemplo.com", "Hola", "mejora");

        Assert.Equal(ResultadoDeSugerencia.NoSePudoEnviar, resultado);
    }

    private async Task<Usuario> CuentaAsync(string correo)
    {
        var usuario = Usuario.Crear(
            CorreoElectronico.Crear(correo),
            NombreDeUsuario.Crear("Ana"),
            "hash",
            DateTimeOffset.UtcNow);
        await _usuarios.AnadirAsync(usuario);
        return usuario;
    }
}
