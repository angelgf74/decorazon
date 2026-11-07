using Decorazon.Aplicacion.Disenos;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Disenos;

namespace Decorazon.Aplicacion.Tests.Disenos;

public class CompartirDisenosTests
{
    private const string Contenido =
        """{"formato":1,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}""";

    private static readonly DateTimeOffset Ahora = new(2026, 11, 2, 12, 0, 0, TimeSpan.Zero);

    private readonly RepositorioDeDisenosEnMemoria _disenos = new();
    private readonly GeneradorDeTokensPredecible _tokens = new();
    private readonly Guid _usuario = Guid.NewGuid();

    private CompartirDisenos CasoDeUso => new(_disenos, _tokens, new RelojFalso(Ahora));

    private Diseno UnDiseno()
    {
        Assert.True(NombreDeDiseno.TryCrear("Cocina", out var nombre));
        Assert.Equal(ResultadoDeContenido.Valido, ContenidoDeDiseno.Validar(Contenido, out var contenido));
        var diseno = Diseno.Crear(_usuario, nombre, TipoDeEstancia.Cocina, contenido!, Ahora);
        _disenos.Anadir(diseno);
        return diseno;
    }

    [Fact]
    public async Task Compartir_DaUnEnlaceNuevo_YLaSegundaVezElMismo()
    {
        var diseno = UnDiseno();

        var primero = await CasoDeUso.CompartirAsync(_usuario, diseno.Id);
        var segundo = await CasoDeUso.CompartirAsync(_usuario, diseno.Id);

        Assert.Equal("token-1", primero);
        Assert.Equal(primero, segundo);
        Assert.Equal(diseno.Id, (await CasoDeUso.ObtenerCompartidoAsync(primero!))?.Id);
    }

    [Fact]
    public async Task UnDisenoAjenoOInexistente_NoSeComparteNiSeRetira()
    {
        var diseno = UnDiseno();

        Assert.Null(await CasoDeUso.CompartirAsync(Guid.NewGuid(), diseno.Id));
        Assert.Null(await CasoDeUso.CompartirAsync(_usuario, Guid.NewGuid()));
        Assert.False(await CasoDeUso.DejarDeCompartirAsync(Guid.NewGuid(), diseno.Id));
        Assert.Null(diseno.EnlaceCompartido);
    }

    [Fact]
    public async Task DejarDeCompartir_ApagaElEnlace_AunqueYaNoSeCompartiera()
    {
        var diseno = UnDiseno();
        var enlace = await CasoDeUso.CompartirAsync(_usuario, diseno.Id);

        Assert.True(await CasoDeUso.DejarDeCompartirAsync(_usuario, diseno.Id));
        Assert.True(await CasoDeUso.DejarDeCompartirAsync(_usuario, diseno.Id));

        Assert.Null(await CasoDeUso.ObtenerCompartidoAsync(enlace!));
    }

    [Fact]
    public async Task LaVistaPreviaDelDueno_SoloLaVeElDueno_YSoloSiLaHay()
    {
        var diseno = UnDiseno();
        byte[] imagen = [0xFF, 0xD8, 0xFF, 1, 2, 3];

        Assert.Null(await CasoDeUso.ObtenerVistaPreviaDelDuenoAsync(_usuario, diseno.Id));
        Assert.Equal(ResultadoDeVistaPrevia.Guardada, await CasoDeUso.GuardarVistaPreviaAsync(_usuario, diseno.Id, imagen));

        var vista = await CasoDeUso.ObtenerVistaPreviaDelDuenoAsync(_usuario, diseno.Id);
        Assert.Equal(imagen, vista?.Imagen);
        Assert.Equal(Ahora, vista?.Fecha);
        Assert.Null(await CasoDeUso.ObtenerVistaPreviaDelDuenoAsync(Guid.NewGuid(), diseno.Id));
        Assert.Null(await CasoDeUso.ObtenerVistaPreviaDelDuenoAsync(_usuario, Guid.NewGuid()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("con espacio")]
    [InlineData("barra/de/ruta")]
    [InlineData("ñandú")]
    public async Task UnEnlaceConFormaImposible_NiSeBusca(string enlace)
    {
        var diseno = UnDiseno();
        diseno.Compartir(enlace.Length > 0 ? enlace : "x");

        Assert.Null(await CasoDeUso.ObtenerCompartidoAsync(enlace));
    }

    [Fact]
    public async Task UnEnlaceDeMasDe64Caracteres_NiSeBusca()
    {
        var largo = new string('a', CompartirDisenos.LongitudMaximaDelEnlace + 1);
        var diseno = UnDiseno();
        diseno.Compartir(largo);

        Assert.Null(await CasoDeUso.ObtenerCompartidoAsync(largo));
    }
}
