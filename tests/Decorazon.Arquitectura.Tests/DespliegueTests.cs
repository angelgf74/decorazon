using System.Text.Json;
using System.Text.RegularExpressions;

namespace Decorazon.Arquitectura.Tests;

/// <summary>
/// El nginx propio (<c>deploy/nginx.conf</c>) lleva el puerto de la API escrito a mano: <c>srv</c> no lo sustituye.
/// Si no coincidiera con el de <c>srv.json</c>, la API seguiría respondiendo por su dominio y solo fallarían, sin
/// que se notara, las tarjetas de los enlaces compartidos.
/// </summary>
public partial class DespliegueTests
{
    [Fact]
    public void ElNginxPropio_ApuntaAlPuertoDeLaApiDeSrvJson()
    {
        var raiz = RaizDelRepositorio();
        using var srv = JsonDocument.Parse(File.ReadAllText(Path.Combine(raiz, "srv.json")));
        var puerto = srv.RootElement.GetProperty("api").GetProperty("puerto").GetInt32();
        Assert.Equal("deploy/nginx.conf", srv.RootElement.GetProperty("nginx").GetString());

        var nginx = File.ReadAllText(Path.Combine(raiz, "deploy", "nginx.conf"));
        var puertos = ProxyALocal().Matches(nginx).Select(m => int.Parse(m.Groups[1].Value)).ToList();

        Assert.NotEmpty(puertos);
        Assert.All(puertos, p => Assert.Equal(puerto, p));
    }

    /// <summary>
    /// El nginx propio ya no recibe los cambios de la plantilla de srv: al menos, los dominios y el tamaño máximo de
    /// la API tienen que seguir siendo los de srv.json.
    /// </summary>
    [Fact]
    public void ElNginxPropio_LlevaLosDominiosYElTamanoDeSrvJson()
    {
        var raiz = RaizDelRepositorio();
        using var srv = JsonDocument.Parse(File.ReadAllText(Path.Combine(raiz, "srv.json")));
        var nginx = File.ReadAllText(Path.Combine(raiz, "deploy", "nginx.conf"));

        Assert.Contains($"server_name {srv.RootElement.GetProperty("web").GetProperty("dominio").GetString()};", nginx);
        Assert.Contains($"server_name {srv.RootElement.GetProperty("api").GetProperty("dominio").GetString()};", nginx);
        Assert.Contains($"client_max_body_size {srv.RootElement.GetProperty("api").GetProperty("tamanoMaximo").GetString()};", nginx);
    }

    [GeneratedRegex(@"proxy_pass http://127\.0\.0\.1:(\d+)")]
    private static partial Regex ProxyALocal();

    private static string RaizDelRepositorio()
    {
        var directorio = new DirectoryInfo(AppContext.BaseDirectory);
        while (directorio is not null && !File.Exists(Path.Combine(directorio.FullName, "srv.json")))
        {
            directorio = directorio.Parent;
        }

        return directorio?.FullName
            ?? throw new InvalidOperationException("No se encontró srv.json subiendo desde el directorio de salida de los tests.");
    }
}
