using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Tests.Registro;

public class SolicitudDeRegistroTests
{
    private static readonly DateTimeOffset Momento = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private const string Json = """{"formato":1,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}""";

    private static SolicitudDeRegistro Crear(DisenoPendiente? diseno = null) =>
        SolicitudDeRegistro.Crear(CorreoElectronico.Crear("alguien@ejemplo.com"), "hash-del-token", diseno, Momento);

    private static DisenoPendiente UnDiseno()
    {
        Assert.True(NombreDeDiseno.TryCrear("Mi salón", out var nombre));
        Assert.Equal(ResultadoDeContenido.Valido, ContenidoDeDiseno.Validar(Json, out var contenido));
        return new DisenoPendiente(nombre, TipoDeEstancia.Salon, contenido!);
    }

    [Fact]
    public void ReciénCreada_EstaVigente()
    {
        Assert.True(Crear().EstaVigente(Momento));
    }

    [Fact]
    public void JustoAntesDeCaducar_SigueVigente()
    {
        var solicitud = Crear();

        Assert.True(solicitud.EstaVigente(Momento + SolicitudDeRegistro.Vigencia - TimeSpan.FromSeconds(1)));
    }

    [Fact]
    public void EnElInstanteDeCaducidad_YaNoEstaVigente()
    {
        var solicitud = Crear();

        // El límite es exclusivo: a la hora exacta ya no vale.
        Assert.False(solicitud.EstaVigente(Momento + SolicitudDeRegistro.Vigencia));
    }

    [Fact]
    public void Consumir_FuncionaUnaVezYSoloUna()
    {
        var solicitud = Crear();

        Assert.True(solicitud.Consumir(Momento));
        Assert.False(solicitud.Consumir(Momento));
        Assert.True(solicitud.EstaConsumida);
    }

    [Fact]
    public void Consumir_FallaSiYaHabiaCaducado()
    {
        var solicitud = Crear();

        Assert.False(solicitud.Consumir(Momento + SolicitudDeRegistro.Vigencia));
        Assert.False(solicitud.EstaConsumida);
    }

    [Fact]
    public void Invalidar_DejaLaSolicitudInservible()
    {
        var solicitud = Crear();

        solicitud.Invalidar(Momento);

        Assert.False(solicitud.EstaVigente(Momento));
        Assert.False(solicitud.Consumir(Momento));
    }

    [Fact]
    public void Invalidar_NoBorraLaMarcaDeConsumo()
    {
        var solicitud = Crear();
        solicitud.Consumir(Momento);

        solicitud.Invalidar(Momento + TimeSpan.FromMinutes(1));

        Assert.True(solicitud.EstaConsumida);
    }

    [Fact]
    public void CrearSinDiseno_NoLoTiene()
    {
        Assert.Null(Crear().Diseno);
    }

    [Fact]
    public void CrearConDiseno_LoConserva()
    {
        var diseno = UnDiseno();

        Assert.Equal(diseno, Crear(diseno).Diseno);
    }

    [Fact]
    public void Consumir_ConservaElDiseno_PorqueLoNecesitaCompletarRegistro()
    {
        var diseno = UnDiseno();
        var solicitud = Crear(diseno);

        Assert.True(solicitud.Consumir(Momento));

        Assert.Equal(diseno, solicitud.Diseno);
    }

    [Fact]
    public void Invalidar_DescartaElDiseno()
    {
        var solicitud = Crear(UnDiseno());

        solicitud.Invalidar(Momento);

        Assert.Null(solicitud.Diseno);
    }

    [Fact]
    public void DescartarDiseno_LoQuita()
    {
        var solicitud = Crear(UnDiseno());

        solicitud.DescartarDiseno();

        Assert.Null(solicitud.Diseno);
    }
}
