using Decorazon.Dominio.Disenos;

namespace Decorazon.Dominio.Tests.Disenos;

public class DisenoTests
{
    private const string Json = """{"formato":1,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}""";
    private static readonly DateTimeOffset T0 = new(2026, 10, 25, 10, 0, 0, TimeSpan.Zero);

    private static NombreDeDiseno Nombre(string texto)
    {
        Assert.True(NombreDeDiseno.TryCrear(texto, out var n));
        return n;
    }

    private static ContenidoDeDiseno Contenido()
    {
        Assert.Equal(ResultadoDeContenido.Valido, ContenidoDeDiseno.Validar(Json, out var c));
        return c!;
    }

    [Fact]
    public void Crear_empieza_en_version_1()
    {
        var usuario = Guid.NewGuid();
        var d = Diseno.Crear(usuario, Nombre("Mi salón"), TipoDeEstancia.Salon, Contenido(), T0);

        Assert.NotEqual(Guid.Empty, d.Id);
        Assert.Equal(usuario, d.UsuarioId);
        Assert.Equal(1, d.Version);
        Assert.Equal(T0, d.FechaDeCreacion);
        Assert.Equal(T0, d.FechaDeModificacion);
    }

    [Fact]
    public void Actualizar_sube_la_version_y_la_fecha_de_modificacion()
    {
        var d = Diseno.Crear(Guid.NewGuid(), Nombre("A"), TipoDeEstancia.Salon, Contenido(), T0);
        var t1 = T0.AddMinutes(5);

        d.Actualizar(Nombre("B"), TipoDeEstancia.Cocina, Contenido(), t1);

        Assert.Equal(2, d.Version);
        Assert.Equal("B", d.Nombre.Valor);
        Assert.Equal(TipoDeEstancia.Cocina, d.Tipo);
        Assert.Equal(t1, d.FechaDeModificacion);
        Assert.Equal(T0, d.FechaDeCreacion);
    }

    [Fact]
    public void Duplicar_anade_copia_y_reinicia_la_version()
    {
        var d = Diseno.Crear(Guid.NewGuid(), Nombre("A"), TipoDeEstancia.Salon, Contenido(), T0);
        d.Actualizar(Nombre("A"), TipoDeEstancia.Salon, Contenido(), T0.AddMinutes(1));

        var copia = d.Duplicar(T0.AddMinutes(2));

        Assert.NotEqual(d.Id, copia.Id);
        Assert.Equal(d.UsuarioId, copia.UsuarioId);
        Assert.Equal("A (copia)", copia.Nombre.Valor);
        Assert.Equal(1, copia.Version);
        Assert.Equal(T0.AddMinutes(2), copia.FechaDeCreacion);
    }

    [Fact]
    public void Duplicar_un_nombre_de_100_caracteres_lo_recorta_a_100()
    {
        var d = Diseno.Crear(Guid.NewGuid(), Nombre(new string('x', 100)), TipoDeEstancia.Salon, Contenido(), T0);

        var copia = d.Duplicar(T0);

        Assert.Equal(100, copia.Nombre.Valor.Length);
        Assert.EndsWith(" (copia)", copia.Nombre.Valor);
    }

    [Fact]
    public void Duplicar_no_parte_un_par_sustituto_al_recortar()
    {
        // El emoji ocupa los caracteres 91 y 92 (índices 90 y 91): cortar en 92 lo partiría.
        var nombre = new string('x', 91) + "😀" + new string('y', 7);
        var d = Diseno.Crear(Guid.NewGuid(), Nombre(nombre), TipoDeEstancia.Salon, Contenido(), T0);

        var copia = d.Duplicar(T0).Nombre.Valor;

        Assert.EndsWith(" (copia)", copia);
        Assert.True(copia.Length <= NombreDeDiseno.LongitudMaxima);
        Assert.False(char.IsHighSurrogate(copia[^9]));
    }
}
