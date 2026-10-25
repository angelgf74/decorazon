using Decorazon.Aplicacion.Disenos;
using Decorazon.Aplicacion.Registro;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Tests.Registro;

public class CompletarRegistroTests
{
    private const string ContrasenaValida = "una-contrasena-larga";
    private const string NombreValido = "Ana Pérez";

    private const string ContenidoA =
        """{"formato":1,"estancia":{"a":true},"aberturas":[],"estructura":[],"elementos":[]}""";

    private const string ContenidoB =
        """{"formato":1,"estancia":{"b":true},"aberturas":[],"estructura":[],"elementos":[]}""";

    private readonly RepositorioDeUsuariosEnMemoria _usuarios = new();
    private readonly RepositorioDeDisenosEnMemoria _disenos = new();
    private readonly RepositorioDeSolicitudesEnMemoria _solicitudes = new();
    private readonly GeneradorDeTokensPredecible _tokens = new();
    private readonly EnviadorDeCorreoEspia _correo = new();
    private readonly HasheadorFalso _hasheador = new();
    private readonly RelojFalso _reloj = new(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero));

    private CompletarRegistro CasoDeUso => new(_usuarios, _disenos, _solicitudes, _tokens, _hasheador, _reloj);

    [Fact]
    public async Task TokenValido_CreaElUsuario()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com");

        var resultado = await CasoDeUso.EjecutarAsync(token, NombreValido, ContrasenaValida);

        Assert.Equal(ResultadoDeCompletarRegistro.Completado, resultado);
        var usuario = Assert.Single(_usuarios.Todos);
        Assert.Equal("alguien@ejemplo.com", usuario.Correo.Valor);
        Assert.Equal(NombreValido, usuario.Nombre.Valor);

        // La contraseña pasa por el hasheador, no se guarda tal cual. Que el
        // resultado sea criptográficamente sólido se comprueba donde toca,
        // en los tests del hasheador real: aquí el hasheador es un doble.
        Assert.NotEqual(ContrasenaValida, usuario.HashDeContrasena);
        Assert.Equal(_hasheador.Hashear(CrearContrasena(ContrasenaValida)), usuario.HashDeContrasena);
    }

    [Fact]
    public async Task SinDiseno_NoCreaDisenos()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com");

        await CasoDeUso.EjecutarAsync(token, NombreValido, ContrasenaValida);

        Assert.Empty(_disenos.Todos);
    }

    [Fact]
    public async Task ElMismoToken_NoSirveDosVeces()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com");
        var casoDeUso = CasoDeUso;

        await casoDeUso.EjecutarAsync(token, NombreValido, ContrasenaValida);
        var segundoIntento = await casoDeUso.EjecutarAsync(token, NombreValido, ContrasenaValida);

        Assert.Equal(ResultadoDeCompletarRegistro.EnlaceNoValido, segundoIntento);
        Assert.Single(_usuarios.Todos);
    }

    [Fact]
    public async Task TokenCaducado_NoCreaCuenta()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com");

        _reloj.Avanzar(SolicitudDeRegistro.Vigencia + TimeSpan.FromMinutes(1));

        var resultado = await CasoDeUso.EjecutarAsync(token, NombreValido, ContrasenaValida);

        Assert.Equal(ResultadoDeCompletarRegistro.EnlaceNoValido, resultado);
        Assert.Empty(_usuarios.Todos);
    }

    [Fact]
    public async Task TokenInexistente_DevuelveElMismoErrorQueUnoCaducado()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com");
        _reloj.Avanzar(SolicitudDeRegistro.Vigencia + TimeSpan.FromMinutes(1));

        var caducado = await CasoDeUso.EjecutarAsync(token, NombreValido, ContrasenaValida);
        var inventado = await CasoDeUso.EjecutarAsync("token-que-nunca-existio", NombreValido, ContrasenaValida);

        // Distinguirlos permitiría sondear qué tokens existieron alguna vez.
        Assert.Equal(caducado, inventado);
    }

    [Fact]
    public async Task ContrasenaDemasiadoCorta_NoCreaCuenta()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com");

        var resultado = await CasoDeUso.EjecutarAsync(token, NombreValido, "corta");

        Assert.Equal(ResultadoDeCompletarRegistro.ContrasenaNoValida, resultado);
        Assert.Empty(_usuarios.Todos);
    }

    [Fact]
    public async Task ContrasenaInvalida_NoConsumeElToken()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com");
        var casoDeUso = CasoDeUso;

        await casoDeUso.EjecutarAsync(token, NombreValido, "corta");
        var reintento = await casoDeUso.EjecutarAsync(token, NombreValido, ContrasenaValida);

        // Equivocarse al elegir contraseña no puede quemar el enlace: si lo hiciera,
        // un error de tecleo obligaría a pedir el alta otra vez.
        Assert.Equal(ResultadoDeCompletarRegistro.Completado, reintento);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task NombreVacio_NoCreaCuenta(string nombre)
    {
        var token = await PedirAltaDe("alguien@ejemplo.com");

        var resultado = await CasoDeUso.EjecutarAsync(token, nombre, ContrasenaValida);

        Assert.Equal(ResultadoDeCompletarRegistro.NombreNoValido, resultado);
        Assert.Empty(_usuarios.Todos);
    }

    [Fact]
    public async Task NombreInvalido_NoConsumeElToken()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com");
        var casoDeUso = CasoDeUso;

        await casoDeUso.EjecutarAsync(token, " ", ContrasenaValida);
        var reintento = await casoDeUso.EjecutarAsync(token, NombreValido, ContrasenaValida);

        Assert.Equal(ResultadoDeCompletarRegistro.Completado, reintento);
    }

    [Fact]
    public async Task SolicitudConDiseno_ElUsuarioNaceConEseDisenoYLaSolicitudQuedaSinEl()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com", new PeticionDeDiseno("Mi salón", "salon", ContenidoA));

        var resultado = await CasoDeUso.EjecutarAsync(token, NombreValido, ContrasenaValida);

        Assert.Equal(ResultadoDeCompletarRegistro.Completado, resultado);
        var usuario = Assert.Single(_usuarios.Todos);
        var diseno = Assert.Single(_disenos.Todos);
        Assert.Equal(usuario.Id, diseno.UsuarioId);
        Assert.Equal("Mi salón", diseno.Nombre.Valor);
        Assert.Equal(TipoDeEstancia.Salon, diseno.Tipo);
        Assert.Equal(ContenidoA, diseno.Contenido.Json);
        Assert.Equal(1, diseno.Version);
        Assert.Null(Assert.Single(_solicitudes.Todas).Diseno);
    }

    /// <summary>
    /// Review Focus 1: pedir el alta dos veces con diseños distintos. Solo el
    /// último enlace sirve y solo su diseño llega a la cuenta.
    /// </summary>
    [Fact]
    public async Task DosSolicitudesConDisenosDistintos_SoloVale_ElUltimoEnlaceYSuDiseno()
    {
        var tokenA = await PedirAltaDe("alguien@ejemplo.com", new PeticionDeDiseno("A", "salon", ContenidoA));
        var tokenB = await PedirAltaDe("alguien@ejemplo.com", new PeticionDeDiseno("B", "cocina", ContenidoB));
        var casoDeUso = CasoDeUso;

        var conLaPrimera = await casoDeUso.EjecutarAsync(tokenA, NombreValido, ContrasenaValida);

        Assert.Equal(ResultadoDeCompletarRegistro.EnlaceNoValido, conLaPrimera);
        Assert.Empty(_usuarios.Todos);
        Assert.Empty(_disenos.Todos);

        var conLaSegunda = await casoDeUso.EjecutarAsync(tokenB, NombreValido, ContrasenaValida);

        Assert.Equal(ResultadoDeCompletarRegistro.Completado, conLaSegunda);
        var diseno = Assert.Single(_disenos.Todos);
        Assert.Equal(ContenidoB, diseno.Contenido.Json);
        Assert.Equal("B", diseno.Nombre.Valor);
    }

    [Fact]
    public async Task ConDatosInvalidos_NoSeCreaElDisenoNiSeDescartaDeLaSolicitud()
    {
        var token = await PedirAltaDe("alguien@ejemplo.com", new PeticionDeDiseno("A", "salon", ContenidoA));

        await CasoDeUso.EjecutarAsync(token, NombreValido, "corta");

        Assert.Empty(_disenos.Todos);
        Assert.NotNull(Assert.Single(_solicitudes.Todas).Diseno);
    }

    private static Contrasena CrearContrasena(string valor)
    {
        Assert.True(Contrasena.TryCrear(valor, out var contrasena));
        return contrasena;
    }

    private async Task<string> PedirAltaDe(string correo, PeticionDeDiseno? diseno = null)
    {
        var solicitar = new SolicitarRegistro(_usuarios, _solicitudes, _tokens, _correo, _reloj);
        await solicitar.EjecutarAsync(correo, diseno, token => token);

        return _tokens.UltimoTokenGenerado;
    }
}
