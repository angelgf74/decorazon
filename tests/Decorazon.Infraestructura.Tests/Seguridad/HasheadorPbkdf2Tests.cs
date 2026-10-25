using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Seguridad;

namespace Decorazon.Infraestructura.Tests.Seguridad;

public class HasheadorPbkdf2Tests
{
    private readonly HasheadorPbkdf2 _hasheador = new();

    private static Contrasena Contrasena(string valor)
    {
        Assert.True(Dominio.Usuarios.Contrasena.TryCrear(valor, out var contrasena));
        return contrasena;
    }

    [Fact]
    public void ElHash_NoContieneLaContrasenaEnClaro()
    {
        var hash = _hasheador.Hashear(Contrasena("una-contrasena-larga"));

        Assert.DoesNotContain("una-contrasena-larga", hash);
    }

    [Fact]
    public void LaMismaContrasena_ProduceHashesDistintos()
    {
        var primero = _hasheador.Hashear(Contrasena("una-contrasena-larga"));
        var segundo = _hasheador.Hashear(Contrasena("una-contrasena-larga"));

        // Sal aleatoria por contraseña: dos usuarios con la misma clave no
        // comparten hash, así que una tabla precalculada no sirve de nada.
        Assert.NotEqual(primero, segundo);
    }

    [Fact]
    public void Verificar_AceptaLaContrasenaCorrecta()
    {
        var hash = _hasheador.Hashear(Contrasena("una-contrasena-larga"));

        Assert.True(_hasheador.Verificar("una-contrasena-larga", hash));
    }

    [Fact]
    public void Verificar_RechazaUnaContrasenaDistinta()
    {
        var hash = _hasheador.Hashear(Contrasena("una-contrasena-larga"));

        Assert.False(_hasheador.Verificar("otra-contrasena-larga", hash));
    }

    [Theory]
    [InlineData("")]
    [InlineData("formato-que-no-toca")]
    [InlineData("pbkdf2-sha256$no-es-un-numero$c2Fs$aGFzaA==")]
    [InlineData("pbkdf2-sha256$1000$no-es-base64$aGFzaA==")]
    [InlineData("otro-algoritmo$1000$c2Fs$aGFzaA==")]
    public void Verificar_DevuelveFalsoAnteHashesCorruptos(string hashAlmacenado)
    {
        // Un hash corrupto en la base de datos debe impedir el acceso,
        // no tumbar el endpoint con una excepción.
        Assert.False(_hasheador.Verificar("una-contrasena-larga", hashAlmacenado));
    }

    [Fact]
    public void ElFormato_LlevaAlgoritmoEIteracionesDentro()
    {
        var hash = _hasheador.Hashear(Contrasena("una-contrasena-larga"));
        var partes = hash.Split('$');

        // Sin estos metadatos no se podría subir el coste sin invalidar
        // todas las contraseñas ya guardadas.
        Assert.Equal(4, partes.Length);
        Assert.Equal("pbkdf2-sha256", partes[0]);
        Assert.True(int.TryParse(partes[1], out var iteraciones));
        Assert.True(iteraciones >= 200_000);
    }

    [Fact]
    public void ElHashSenuelo_NoCoincideConNingunaContrasena()
    {
        // Existe para igualar el tiempo de respuesta del login cuando el
        // correo no existe; nunca debe dejar entrar a nadie.
        Assert.False(_hasheador.Verificar("una-contrasena-larga", _hasheador.HashSenuelo));
        Assert.False(_hasheador.Verificar(string.Empty, _hasheador.HashSenuelo));
    }
}
