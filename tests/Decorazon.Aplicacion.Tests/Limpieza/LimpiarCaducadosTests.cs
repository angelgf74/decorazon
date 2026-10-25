using Decorazon.Aplicacion.Limpieza;
using Decorazon.Aplicacion.Tests.Dobles;

namespace Decorazon.Aplicacion.Tests.Limpieza;

/// <summary>Borrar lo caducado: el borrado real se prueba contra PostgreSQL.</summary>
public class LimpiarCaducadosTests
{
    private readonly RelojFalso _reloj = new(new DateTimeOffset(2026, 10, 11, 3, 0, 0, TimeSpan.Zero));
    private readonly LimpiezaEspia _limpieza = new();

    /// <summary>
    /// 7 días, que es lo que dice la política de privacidad. Si se cambia aquí,
    /// hay que cambiarlo allí (y su test).
    /// </summary>
    [Fact]
    public async Task BorraLoTerminadoAntesDeHaceSieteDias()
    {
        await new LimpiarCaducados(_limpieza, _reloj).EjecutarAsync();

        Assert.Equal(new DateTimeOffset(2026, 10, 4, 3, 0, 0, TimeSpan.Zero), _limpieza.Limite);
        Assert.Equal(TimeSpan.FromDays(7), LimpiarCaducados.PlazoDeConservacion);
    }

    [Fact]
    public async Task DescartaLosDisenosDeLasAltasCaducadasAhora()
    {
        _limpieza.DisenosPorDescartar = 3;

        var resultado = await new LimpiarCaducados(_limpieza, _reloj).EjecutarAsync();

        // Sin esperar a los 7 días: en cuanto caduca la solicitud, su diseño sobra.
        Assert.Equal(_reloj.Ahora, _limpieza.AhoraDeDescarte);
        Assert.Equal(3, resultado.DisenosDescartados);
    }
}
