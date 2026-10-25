using System.Xml.Linq;

namespace Decorazon.Arquitectura.Tests;

/// <summary>
/// Complemento de <see cref="ReglaDeDependenciasTests"/>, que inspecciona el ensamblado compilado.
/// <para>
/// Ese enfoque tiene un punto ciego comprobado: si alguien añade el paquete de EF Core a
/// <c>Decorazon.Dominio</c> pero todavía no usa ningún tipo suyo, el compilador no emite la
/// referencia en el manifiesto y la violación pasa desapercibida hasta el primer uso real.
/// </para>
/// <para>
/// Estos tests leen directamente los <c>.csproj</c>, así que detectan la infracción en el momento
/// en que se declara la dependencia, no cuando se estrena.
/// </para>
/// </summary>
public class ReferenciasDeProyectoTests
{
    private static readonly string[] PaquetesProhibidosEnElDominio =
    [
        "Microsoft.EntityFrameworkCore",
        "Microsoft.AspNetCore",
        "Npgsql",
        "Microsoft.Extensions.DependencyInjection"
    ];

    [Fact]
    public void Dominio_NoDeclaraPaquetesDeInfraestructura()
    {
        var prohibidos = PaquetesDe("src/Decorazon.Dominio/Decorazon.Dominio.csproj")
            .Where(paquete => PaquetesProhibidosEnElDominio.Any(prohibido =>
                paquete.StartsWith(prohibido, StringComparison.OrdinalIgnoreCase)))
            .ToArray();

        Assert.True(
            prohibidos.Length == 0,
            $"Decorazon.Dominio no puede declarar paquetes de infraestructura: {string.Join(", ", prohibidos)}.");
    }

    [Fact]
    public void Dominio_NoDeclaraReferenciasAOtrosProyectos()
    {
        var referencias = ProyectosReferenciadosPor("src/Decorazon.Dominio/Decorazon.Dominio.csproj");

        Assert.True(
            referencias.Length == 0,
            $"Decorazon.Dominio es el centro: no referencia a nadie. Encontrado: {string.Join(", ", referencias)}.");
    }

    [Fact]
    public void Aplicacion_NoReferenciaAInfraestructura()
    {
        var referencias = ProyectosReferenciadosPor("src/Decorazon.Aplicacion/Decorazon.Aplicacion.csproj");

        Assert.DoesNotContain("Decorazon.Infraestructura", referencias);
        Assert.DoesNotContain("Decorazon.Api", referencias);
    }

    [Fact]
    public void Contratos_NoReferenciaANadie()
    {
        var referencias = ProyectosReferenciadosPor("src/Decorazon.Contratos/Decorazon.Contratos.csproj");

        Assert.True(
            referencias.Length == 0,
            $"Decorazon.Contratos debe poder publicarse solo. Encontrado: {string.Join(", ", referencias)}.");
    }

    [Fact]
    public void LaLecturaDeReferencias_DevuelveNombresDeProyecto_NoRutas()
    {
        // Vigila la herramienta, no el código. Si esto se rompe, el resto de
        // tests de este archivo dejan de proteger nada **sin fallar**: son casi
        // todos `DoesNotContain`, y un valor mal extraído nunca coincide con lo
        // prohibido, así que pasan siempre.
        //
        // En `recetas` ocurrió exactamente eso en Linux, porque los .csproj
        // escriben las rutas con barras invertidas.
        var referencias = ProyectosReferenciadosPor("src/Decorazon.Api/Decorazon.Api.csproj");

        Assert.NotEmpty(referencias);

        Assert.All(referencias, referencia =>
        {
            Assert.DoesNotContain("\\", referencia);
            Assert.DoesNotContain("/", referencia);
            Assert.StartsWith("Decorazon.", referencia);
        });
    }

    private static string[] PaquetesDe(string rutaRelativa) =>
        DocumentoDe(rutaRelativa)
            .Descendants("PackageReference")
            .Select(elemento => elemento.Attribute("Include")?.Value ?? string.Empty)
            .ToArray();

    private static string[] ProyectosReferenciadosPor(string rutaRelativa) =>
        DocumentoDe(rutaRelativa)
            .Descendants("ProjectReference")
            .Select(elemento => NombreDelProyecto(elemento.Attribute("Include")?.Value ?? string.Empty))
            .ToArray();

    /// <summary>
    /// Extrae el nombre del proyecto de una ruta de <c>ProjectReference</c>.
    /// </summary>
    /// <remarks>
    /// <b>Las barras invertidas se normalizan primero, y no es cosmético.</b> Los
    /// <c>.csproj</c> escriben las rutas al estilo de Windows
    /// (<c>..\..\src\Decorazon.Web\Decorazon.Web.csproj</c>), y en Linux
    /// <c>Path.GetFileNameWithoutExtension</c> no reconoce <c>\</c> como
    /// separador: devolvía la ruta entera en lugar del nombre.
    /// <para>
    /// El efecto era peor que un test roto. Las comprobaciones de este archivo
    /// son en su mayoría <c>DoesNotContain</c>, así que en Linux <b>pasaban
    /// siempre</b>, hubiera violación de la regla de dependencias o no: el valor
    /// comparado nunca podía coincidir. En `recetas` lo destapó la integración continua al
    /// ejecutarlas por primera vez fuera de Windows.
    /// </para>
    /// </remarks>
    private static string NombreDelProyecto(string include) =>
        Path.GetFileNameWithoutExtension(include.Replace('\\', '/'));

    /// <summary>
    /// Admite ruta relativa a la raíz del repositorio o absoluta: <c>Path.Combine</c>
    /// devuelve la segunda tal cual si ya lo es.
    /// </summary>
    private static XDocument DocumentoDe(string ruta) =>
        XDocument.Load(Path.Combine(RaizDelRepositorio(), ruta));

    /// <summary>
    /// Sube desde el directorio de salida hasta encontrar el archivo de solución.
    /// Acepta <c>.slnx</c> (formato de .NET 10) y <c>.sln</c>, para no romperse si se migra el formato.
    /// </summary>
    private static string RaizDelRepositorio()
    {
        var directorio = new DirectoryInfo(AppContext.BaseDirectory);

        while (directorio is not null && !ContieneLaSolucion(directorio))
        {
            directorio = directorio.Parent;
        }

        return directorio?.FullName
            ?? throw new InvalidOperationException(
                "No se encontró Decorazon.slnx ni Decorazon.sln subiendo desde el directorio de salida de los tests.");
    }

    private static bool ContieneLaSolucion(DirectoryInfo directorio) =>
        File.Exists(Path.Combine(directorio.FullName, "Decorazon.slnx"))
        || File.Exists(Path.Combine(directorio.FullName, "Decorazon.sln"));
}
