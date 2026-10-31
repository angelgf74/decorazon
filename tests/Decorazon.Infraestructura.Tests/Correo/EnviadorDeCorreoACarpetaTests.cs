using System.Collections.Concurrent;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Correo;
using Microsoft.Extensions.Logging.Abstractions;

namespace Decorazon.Infraestructura.Tests.Correo;

public class EnviadorDeCorreoACarpetaTests : IDisposable
{
    private readonly string _carpeta = Path.Combine(Path.GetTempPath(), "decorazon-correo-" + Guid.NewGuid().ToString("N"), "anidada");

    [Fact]
    public async Task EscribeUnFicheroConParaAsuntoYElEnlaceEnElCuerpo()
    {
        var enviador = new EnviadorDeCorreoACarpeta(_carpeta, NullLogger<EnviadorDeCorreoDeConsola>.Instance);

        await enviador.EnviarEnlaceDeContrasenaAsync(
            CorreoElectronico.Crear("ana@example.com"), "https://decorazon.test/contrasena/restablecer?token=abc");

        var fichero = Assert.Single(Directory.GetFiles(_carpeta, "*.txt"));
        var lineas = (await File.ReadAllTextAsync(fichero)).Split('\n').Select(l => l.TrimEnd('\r')).ToArray();
        Assert.Equal("Para: ana@example.com", lineas[0]);
        Assert.StartsWith("Asunto: ", lineas[1]);
        Assert.Equal(string.Empty, lineas[2]);
        Assert.Contains("https://decorazon.test/contrasena/restablecer?token=abc", string.Join('\n', lineas.Skip(3)));
    }

    [Fact]
    public async Task CadaCorreoVaAUnFicheroDistinto()
    {
        var enviador = new EnviadorDeCorreoACarpeta(_carpeta, NullLogger<EnviadorDeCorreoDeConsola>.Instance);
        var correo = CorreoElectronico.Crear("ana@example.com");

        await enviador.EnviarEnlaceDeAltaAsync(correo, "https://decorazon.test/a");
        await enviador.EnviarEnlaceDeAltaAsync(correo, "https://decorazon.test/b");

        Assert.Equal(2, Directory.GetFiles(_carpeta, "*.txt").Length);
    }

    [Fact]
    public async Task EscribeEnUnTemporalYLoRenombraAlFinalParaQueNadieLeaUnCorreoAMedias()
    {
        Directory.CreateDirectory(_carpeta);
        var renombrados = new ConcurrentQueue<(string Viejo, string Nuevo)>();
        using var vigia = new FileSystemWatcher(_carpeta) { EnableRaisingEvents = true };
        vigia.Renamed += (_, e) => renombrados.Enqueue((e.OldName ?? string.Empty, e.Name ?? string.Empty));
        var enviador = new EnviadorDeCorreoACarpeta(_carpeta, NullLogger<EnviadorDeCorreoDeConsola>.Instance);

        await enviador.EnviarEnlaceDeAltaAsync(CorreoElectronico.Crear("ana@example.com"), "https://decorazon.test/a");

        var limite = DateTime.UtcNow.AddSeconds(5);
        while (renombrados.IsEmpty && DateTime.UtcNow < limite)
        {
            await Task.Delay(20);
        }
        var (viejo, nuevo) = Assert.Single(renombrados);
        Assert.EndsWith(".tmp", viejo);
        Assert.EndsWith(".txt", nuevo);
        Assert.Empty(Directory.GetFiles(_carpeta, "*.tmp"));
        Assert.Single(Directory.GetFiles(_carpeta, "*.txt"));
    }

    [Fact]
    public void CarpetaDeSimuladosFueraDeDesarrolloSeRechaza()
    {
        var opciones = new OpcionesDeCorreo
        {
            UsarBrevo = true,
            BaseDeLaWeb = "https://decorazon.test",
            CarpetaDeSimulados = "/tmp/correos"
        };

        var excepcion = Assert.Throws<InvalidOperationException>(opciones.ValidarFueraDeDesarrollo);

        Assert.Contains("Correo:CarpetaDeSimulados", excepcion.Message);
    }

    public void Dispose()
    {
        var raiz = Path.GetDirectoryName(_carpeta)!;
        if (Directory.Exists(raiz))
        {
            Directory.Delete(raiz, true);
        }
    }
}
