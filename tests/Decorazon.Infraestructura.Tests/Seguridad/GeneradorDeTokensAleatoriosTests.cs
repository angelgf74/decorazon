using Decorazon.Infraestructura.Seguridad;

namespace Decorazon.Infraestructura.Tests.Seguridad;

public class GeneradorDeTokensAleatoriosTests
{
    private readonly GeneradorDeTokensAleatorios _generador = new();

    [Fact]
    public void CadaToken_EsDistinto()
    {
        var tokens = Enumerable.Range(0, 500).Select(_ => _generador.GenerarToken()).ToHashSet();

        Assert.Equal(500, tokens.Count);
    }

    [Fact]
    public void ElToken_ViajaEnUnaUrlSinEscapes()
    {
        var token = _generador.GenerarToken();

        // Base64url: sin '+', '/' ni '=' que haya que escapar en la URL del correo.
        Assert.DoesNotContain('+', token);
        Assert.DoesNotContain('/', token);
        Assert.DoesNotContain('=', token);
        Assert.Equal(token, Uri.EscapeDataString(token));
    }

    [Fact]
    public void ElToken_TieneEntropiaSuficiente()
    {
        var token = _generador.GenerarToken();

        // 32 bytes en base64 sin relleno son 43 caracteres.
        Assert.True(token.Length >= 43, $"Token demasiado corto: {token.Length} caracteres.");
    }

    [Fact]
    public void Hashear_EsDeterminista()
    {
        var token = _generador.GenerarToken();

        Assert.Equal(_generador.Hashear(token), _generador.Hashear(token));
    }

    [Fact]
    public void ElHash_NoContieneElToken()
    {
        var token = _generador.GenerarToken();

        // Lo que se guarda en la base de datos no debe permitir reconstruir el enlace.
        Assert.DoesNotContain(token, _generador.Hashear(token));
    }

    [Fact]
    public void TokensDistintos_ProducenHashesDistintos()
    {
        Assert.NotEqual(
            _generador.Hashear(_generador.GenerarToken()),
            _generador.Hashear(_generador.GenerarToken()));
    }
}
