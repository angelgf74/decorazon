using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Tests.Usuarios;

public class SolicitudDeContrasenaTests
{
    private static readonly DateTimeOffset Momento = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private static SolicitudDeContrasena Crear() =>
        SolicitudDeContrasena.Crear(Guid.NewGuid(), "hash-del-token", Momento);

    [Fact]
    public void CaducaAntesQueElEnlaceDeAlta()
    {
        // No es un detalle de configuración: el enlace de alta solo crea una cuenta
        // que aún no existe, este toma el control de una que ya tiene diseños dentro.
        Assert.True(SolicitudDeContrasena.Vigencia < SolicitudDeRegistro.Vigencia);
        Assert.Equal(TimeSpan.FromHours(1), SolicitudDeContrasena.Vigencia);
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

        Assert.True(solicitud.EstaVigente(Momento + SolicitudDeContrasena.Vigencia - TimeSpan.FromSeconds(1)));
    }

    [Fact]
    public void EnElInstanteDeCaducidad_YaNoEstaVigente()
    {
        var solicitud = Crear();

        // El límite es exclusivo: a la hora exacta ya no vale.
        Assert.False(solicitud.EstaVigente(Momento + SolicitudDeContrasena.Vigencia));
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

        Assert.False(solicitud.Consumir(Momento + SolicitudDeContrasena.Vigencia));
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
    public void SinUsuario_NoSePuedeCrear()
    {
        Assert.Throws<ArgumentException>(() =>
            SolicitudDeContrasena.Crear(Guid.Empty, "hash-del-token", Momento));
    }
}
