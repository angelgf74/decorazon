using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Tests.Usuarios;

public class NombreDeUsuarioTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void RechazaUnNombreVacio(string? entrada)
    {
        Assert.False(NombreDeUsuario.TryCrear(entrada, out _));
    }

    /// <summary>
    /// PostgreSQL no admite el carácter nulo en texto (22021): mejor rechazarlo aquí que dar un 500.
    /// Tabuladores y saltos de línea no llegan a contar: antes se normalizan a un espacio.
    /// </summary>
    [Theory]
    [InlineData("Ana\u0000Pérez")]
    [InlineData("Ana\u0007")]
    [InlineData("\u001bAna")]
    public void RechazaCaracteresDeControl(string entrada)
    {
        Assert.False(NombreDeUsuario.TryCrear(entrada, out _));
    }

    [Fact]
    public void LosTabuladoresYSaltosDeLinea_SeNormalizanAUnEspacio()
    {
        Assert.True(NombreDeUsuario.TryCrear("Ana\tPérez\nGil", out var nombre));
        Assert.Equal("Ana Pérez Gil", nombre.Valor);
    }

    [Fact]
    public void RechazaUnNombreDemasiadoLargo()
    {
        var largo = new string('a', NombreDeUsuario.LongitudMaxima + 1);

        Assert.False(NombreDeUsuario.TryCrear(largo, out _));
    }

    [Fact]
    public void AceptaUnNombreDeLaLongitudMaxima()
    {
        var justo = new string('a', NombreDeUsuario.LongitudMaxima);

        Assert.True(NombreDeUsuario.TryCrear(justo, out _));
    }

    [Fact]
    public void QuitaLosEspaciosSobrantes()
    {
        Assert.True(NombreDeUsuario.TryCrear("  Ana   Pérez ", out var nombre));

        Assert.Equal("Ana Pérez", nombre.Valor);
    }

    /// <summary>
    /// A diferencia del correo, no se pasa a minúsculas: es el nombre con el que
    /// el usuario se presenta, y se muestra tal como lo escribió.
    /// </summary>
    [Fact]
    public void ConservaMayusculasYAcentos()
    {
        Assert.Equal("José Ángel", NombreDeUsuario.Crear("José Ángel").Valor);
    }

    [Fact]
    public void Crear_ConUnNombreInvalido_Lanza()
    {
        Assert.Throws<ArgumentException>(() => NombreDeUsuario.Crear(" "));
    }
}
