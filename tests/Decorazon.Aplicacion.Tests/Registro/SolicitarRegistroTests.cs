using Decorazon.Aplicacion.Disenos;
using Decorazon.Aplicacion.Registro;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Tests.Registro;

public class SolicitarRegistroTests
{
    private const string ContenidoValido =
        """{"formato":1,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}""";

    private readonly RepositorioDeUsuariosEnMemoria _usuarios = new();
    private readonly RepositorioDeSolicitudesEnMemoria _solicitudes = new();
    private readonly GeneradorDeTokensPredecible _tokens = new();
    private readonly EnviadorDeCorreoEspia _correo = new();
    private readonly RelojFalso _reloj = new(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero));

    private SolicitarRegistro CasoDeUso => new(_usuarios, _solicitudes, _tokens, _correo, _reloj);

    private static string Enlace(string token) => $"https://decorazon.example/registro/completar?token={token}";

    private static PeticionDeDiseno Diseno(string nombre = "Salón de casa", string tipo = "salon", string contenido = ContenidoValido) =>
        new(nombre, tipo, contenido);

    [Fact]
    public async Task CorreoNuevo_CreaSolicitudYEnviaEnlace()
    {
        var resultado = await CasoDeUso.EjecutarAsync("Nuevo@Ejemplo.COM", null, Enlace);

        Assert.Equal(ResultadoDeSolicitud.Aceptada, resultado);
        var solicitud = Assert.Single(_solicitudes.Todas);
        Assert.Null(solicitud.Diseno);
        var envio = Assert.Single(_correo.EnlacesDeAlta);

        // El correo se normaliza a minúsculas: la unicidad no puede depender
        // de cómo lo escriba el usuario.
        Assert.Equal("nuevo@ejemplo.com", envio.Destinatario);
        Assert.Contains(_tokens.UltimoTokenGenerado, envio.Enlace);
    }

    [Fact]
    public async Task SiElProveedorDeCorreoFalla_CorreoNoEnviado()
    {
        _correo.ProveedorCaido = true;

        var resultado = await CasoDeUso.EjecutarAsync("nuevo@ejemplo.com", null, Enlace);

        Assert.Equal(ResultadoDeSolicitud.CorreoNoEnviado, resultado);
    }

    [Fact]
    public async Task SiElProveedorFallaConCuentaExistente_TambienCorreoNoEnviado()
    {
        await _usuarios.AnadirAsync(Usuario.Crear(
            CorreoElectronico.Crear("ya@ejemplo.com"), NombreDeUsuario.Crear("Ana"), "hash", _reloj.Ahora));
        _correo.ProveedorCaido = true;

        var resultado = await CasoDeUso.EjecutarAsync("ya@ejemplo.com", null, Enlace);

        Assert.Equal(ResultadoDeSolicitud.CorreoNoEnviado, resultado);
    }

    [Fact]
    public async Task CorreoInvalido_NoCreaNadaNiEnvia()
    {
        var resultado = await CasoDeUso.EjecutarAsync("esto-no-es-un-correo", null, Enlace);

        Assert.Equal(ResultadoDeSolicitud.CorreoInvalido, resultado);
        Assert.Empty(_solicitudes.Todas);
        Assert.Empty(_correo.EnlacesDeAlta);
    }

    [Fact]
    public async Task CorreoYaRegistrado_AvisaAlDuenoYNoDejaSolicitudUtilizableNiDiseno()
    {
        await DarDeAltaUsuario("existente@ejemplo.com");

        var resultado = await CasoDeUso.EjecutarAsync("existente@ejemplo.com", null, Enlace);

        Assert.Equal(ResultadoDeSolicitud.Aceptada, resultado);
        Assert.DoesNotContain(_solicitudes.Todas, solicitud => solicitud.EstaVigente(_reloj.Ahora) || solicitud.Diseno is not null);
        Assert.Empty(_correo.EnlacesDeAlta);
        Assert.Single(_correo.AvisosDeCuentaExistente);
    }

    /// <summary>
    /// El criterio de aceptación central del paso 1: la respuesta no puede
    /// depender de si el correo ya tenía cuenta.
    /// </summary>
    [Fact]
    public async Task ElResultado_EsIdentico_ExistaONoLaCuenta()
    {
        await DarDeAltaUsuario("existente@ejemplo.com");

        var conCuenta = await CasoDeUso.EjecutarAsync("existente@ejemplo.com", null, Enlace);
        var sinCuenta = await CasoDeUso.EjecutarAsync("nuevo@ejemplo.com", null, Enlace);

        Assert.Equal(conCuenta, sinCuenta);
    }

    [Fact]
    public async Task SolicitarDeNuevo_InvalidaElEnlaceAnterior()
    {
        var casoDeUso = CasoDeUso;

        await casoDeUso.EjecutarAsync("alguien@ejemplo.com", null, Enlace);
        var primera = _solicitudes.Todas.Single();

        _reloj.Avanzar(TimeSpan.FromMinutes(5));
        await casoDeUso.EjecutarAsync("alguien@ejemplo.com", null, Enlace);

        Assert.Equal(2, _solicitudes.Todas.Count);
        Assert.False(primera.EstaVigente(_reloj.Ahora));
        Assert.True(_solicitudes.Todas[1].EstaVigente(_reloj.Ahora));
    }

    [Fact]
    public async Task ConDisenoValido_LaSolicitudGuardadaLoLleva()
    {
        var resultado = await CasoDeUso.EjecutarAsync("alguien@ejemplo.com", Diseno(), Enlace);

        Assert.Equal(ResultadoDeSolicitud.Aceptada, resultado);
        var diseno = Assert.Single(_solicitudes.Todas).Diseno;
        Assert.NotNull(diseno);
        Assert.Equal("Salón de casa", diseno.Nombre.Valor);
        Assert.Equal(TipoDeEstancia.Salon, diseno.Tipo);
        Assert.Equal(ContenidoValido, diseno.Contenido.Json);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task DisenoSinNombre_SeLlamaMiDiseno(string? nombre)
    {
        var peticion = new PeticionDeDiseno(nombre, "cocina", ContenidoValido);

        var resultado = await CasoDeUso.EjecutarAsync("alguien@ejemplo.com", peticion, Enlace);

        Assert.Equal(ResultadoDeSolicitud.Aceptada, resultado);
        Assert.Equal("Mi diseño", Assert.Single(_solicitudes.Todas).Diseno!.Nombre.Valor);
    }

    [Theory]
    [InlineData("""{"formato":1,"estancia":{}""")]
    [InlineData("""{"formato":2,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}""")]
    [InlineData("")]
    public async Task DisenoConContenidoRoto_EsDisenoNoValidoYNoEnviaCorreo(string contenido)
    {
        var resultado = await CasoDeUso.EjecutarAsync("alguien@ejemplo.com", Diseno(contenido: contenido), Enlace);

        Assert.Equal(ResultadoDeSolicitud.DisenoNoValido, resultado);
        Assert.Empty(_solicitudes.Todas);
        Assert.Empty(_correo.EnlacesDeAlta);
    }

    [Fact]
    public async Task DisenoConTipoDesconocido_EsDisenoNoValido()
    {
        var resultado = await CasoDeUso.EjecutarAsync("alguien@ejemplo.com", Diseno(tipo: "garaje"), Enlace);

        Assert.Equal(ResultadoDeSolicitud.DisenoNoValido, resultado);
        Assert.Empty(_correo.EnlacesDeAlta);
    }

    [Fact]
    public async Task CuartaSolicitudEnUnaHora_EsDemasiadasSolicitudesYNoEnviaCorreo()
    {
        var casoDeUso = CasoDeUso;

        for (var i = 0; i < 3; i++)
        {
            _reloj.Avanzar(TimeSpan.FromMinutes(10));
            Assert.Equal(ResultadoDeSolicitud.Aceptada, await casoDeUso.EjecutarAsync("alguien@ejemplo.com", null, Enlace));
        }

        _reloj.Avanzar(TimeSpan.FromMinutes(10));
        var cuarta = await casoDeUso.EjecutarAsync("alguien@ejemplo.com", Diseno(), Enlace);

        Assert.Equal(ResultadoDeSolicitud.DemasiadasSolicitudes, cuarta);
        Assert.Equal(3, _solicitudes.Todas.Count);
        Assert.Equal(3, _correo.EnlacesDeAlta.Count);
    }

    /// <summary>
    /// Si solo contaran los correos nuevos, la cuarta petición daría 429 para un correo
    /// nuevo y 200 para uno con cuenta: otra forma de averiguar quién está registrado.
    /// </summary>
    [Fact]
    public async Task CorreoConCuenta_TambienAlcanzaElLimite_ComoUnoNuevo()
    {
        await DarDeAltaUsuario("existente@ejemplo.com");
        var casoDeUso = CasoDeUso;

        for (var i = 0; i < 3; i++)
        {
            Assert.Equal(ResultadoDeSolicitud.Aceptada, await casoDeUso.EjecutarAsync("existente@ejemplo.com", null, Enlace));
        }

        var cuarta = await casoDeUso.EjecutarAsync("existente@ejemplo.com", Diseno(), Enlace);

        Assert.Equal(ResultadoDeSolicitud.DemasiadasSolicitudes, cuarta);
        Assert.Equal(3, _correo.AvisosDeCuentaExistente.Count);
        Assert.Empty(_correo.EnlacesDeAlta);
        Assert.DoesNotContain(_solicitudes.Todas, solicitud => solicitud.EstaVigente(_reloj.Ahora) || solicitud.Diseno is not null);
    }

    [Fact]
    public async Task PasadaLaHora_VuelveAAceptar()
    {
        var casoDeUso = CasoDeUso;

        for (var i = 0; i < 3; i++)
        {
            await casoDeUso.EjecutarAsync("alguien@ejemplo.com", null, Enlace);
        }

        _reloj.Avanzar(TimeSpan.FromHours(1) + TimeSpan.FromMinutes(1));

        Assert.Equal(ResultadoDeSolicitud.Aceptada, await casoDeUso.EjecutarAsync("alguien@ejemplo.com", null, Enlace));
    }

    [Fact]
    public async Task ElLimite_EsPorCorreo()
    {
        var casoDeUso = CasoDeUso;

        for (var i = 0; i < 3; i++)
        {
            await casoDeUso.EjecutarAsync("alguien@ejemplo.com", null, Enlace);
        }

        Assert.Equal(ResultadoDeSolicitud.Aceptada, await casoDeUso.EjecutarAsync("otro@ejemplo.com", null, Enlace));
    }

    [Fact]
    public async Task CorreoConCuentaYDiseno_AvisaYNoGuardaNingunDiseno()
    {
        await DarDeAltaUsuario("existente@ejemplo.com");

        var resultado = await CasoDeUso.EjecutarAsync("existente@ejemplo.com", Diseno(), Enlace);

        Assert.Equal(ResultadoDeSolicitud.Aceptada, resultado);
        Assert.Single(_correo.AvisosDeCuentaExistente);
        Assert.Empty(_correo.EnlacesDeAlta);
        Assert.DoesNotContain(_solicitudes.Todas, solicitud => solicitud.Diseno is not null);
    }

    [Fact]
    public async Task SolicitarDeNuevo_LaAnteriorPierdeSuDiseno()
    {
        var casoDeUso = CasoDeUso;

        await casoDeUso.EjecutarAsync("alguien@ejemplo.com", Diseno(nombre: "A"), Enlace);
        await casoDeUso.EjecutarAsync("alguien@ejemplo.com", Diseno(nombre: "B"), Enlace);

        Assert.Null(_solicitudes.Todas[0].Diseno);
        Assert.Equal("B", _solicitudes.Todas[1].Diseno!.Nombre.Valor);
    }

    private async Task DarDeAltaUsuario(string correo)
    {
        var usuario = Usuario.Crear(CorreoElectronico.Crear(correo), NombreDeUsuario.Crear("Ana"), "hash", _reloj.Ahora);
        await _usuarios.AnadirAsync(usuario);
    }
}
