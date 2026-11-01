using Decorazon.Aplicacion.Disenos;
using Decorazon.Aplicacion.Tests.Dobles;
using Decorazon.Dominio.Disenos;

namespace Decorazon.Aplicacion.Tests.Disenos;

public class GestionDeDisenosTests
{
    private const string Contenido =
        """{"formato":1,"estancia":{"a":true},"aberturas":[],"estructura":[],"elementos":[]}""";

    private const string OtroContenido =
        """{"formato":1,"estancia":{"b":true},"aberturas":[],"estructura":[],"elementos":[]}""";

    private readonly RepositorioDeDisenosEnMemoria _disenos = new();
    private readonly RelojFalso _reloj = new(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero));
    private readonly Guid _usuario = Guid.NewGuid();

    // Guardados del montaje previo: los tests miden solo lo que hace la operación probada.
    private int _guardadosPrevios;

    private GestionDeDisenos CasoDeUso => new(_disenos, _reloj);

    private int GuardadosDeLaOperacion => _disenos.GuardadosSolicitados - _guardadosPrevios;

    private static PeticionDeDiseno Peticion(
        string? nombre = "Salón", string? tipo = "salon", string? contenido = Contenido, Guid? id = null) =>
        new(nombre, tipo, contenido, id);

    private async Task<Diseno> CrearUnoAsync(Guid? usuario = null, string nombre = "Salón", Guid? id = null)
    {
        var resultado = await CasoDeUso.CrearAsync(usuario ?? _usuario, Peticion(nombre, id: id));
        Assert.Equal(EstadoDeDiseno.Correcto, resultado.Estado);
        _guardadosPrevios = _disenos.GuardadosSolicitados;
        return resultado.Diseno!;
    }

    [Fact]
    public async Task Crear_EmpiezaEnVersion1_YGuardaUnaVez()
    {
        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion());

        Assert.Equal(EstadoDeDiseno.Correcto, resultado.Estado);
        Assert.Equal(1, resultado.Diseno!.Version);
        Assert.Equal(_usuario, resultado.Diseno.UsuarioId);
        Assert.Single(_disenos.Todos);
        Assert.Equal(1, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Crear_ConCienDisenos_LimiteAlcanzado()
    {
        for (var i = 0; i < Diseno.MaximoPorUsuario; i++)
        {
            await CrearUnoAsync(nombre: $"D{i}");
        }

        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion());

        Assert.Equal(EstadoDeDiseno.LimiteAlcanzado, resultado.Estado);
        Assert.Equal(Diseno.MaximoPorUsuario, _disenos.Todos.Count);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Crear_ElLimiteEsPorUsuario()
    {
        for (var i = 0; i < Diseno.MaximoPorUsuario; i++)
        {
            await CrearUnoAsync(nombre: $"D{i}");
        }

        var resultado = await CasoDeUso.CrearAsync(Guid.NewGuid(), Peticion());

        Assert.Equal(EstadoDeDiseno.Correcto, resultado.Estado);
    }

    [Fact]
    public async Task Crear_NombreEnBlanco_NoSeRellena()
    {
        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion(nombre: "   "));

        Assert.Equal(EstadoDeDiseno.NombreNoValido, resultado.Estado);
        Assert.Empty(_disenos.Todos);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Crear_TipoBano_TipoNoValido()
    {
        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion(tipo: "baño"));

        Assert.Equal(EstadoDeDiseno.TipoNoValido, resultado.Estado);
        Assert.Empty(_disenos.Todos);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Crear_ContenidoRoto_ContenidoNoValidoConElDetalle()
    {
        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion(contenido: "{no es json"));

        Assert.Equal(EstadoDeDiseno.ContenidoNoValido, resultado.Estado);
        Assert.Equal(ResultadoDeContenido.NoEsJson, resultado.Contenido);
        Assert.Empty(_disenos.Todos);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task CrearConId_UsaEseId()
    {
        var id = Guid.NewGuid();

        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion(id: id));

        Assert.Equal(EstadoDeDiseno.Correcto, resultado.Estado);
        Assert.Equal(id, resultado.Diseno!.Id);
        Assert.Equal(id, Assert.Single(_disenos.Todos).Id);
    }

    [Fact]
    public async Task CrearConIdExistenteDelMismoUsuario_DevuelveYaCreadoSinAnadir()
    {
        var id = Guid.NewGuid();
        var existente = await CrearUnoAsync(id: id);

        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion("Otro nombre", id: id));

        Assert.Equal(EstadoDeDiseno.YaCreado, resultado.Estado);
        Assert.Same(existente, resultado.Diseno);
        Assert.Equal("Salón", existente.Nombre.Valor);
        Assert.Single(_disenos.Todos);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task CrearConIdDeOtroUsuario_DevuelveIdentificadorEnUso()
    {
        var id = Guid.NewGuid();
        var ajeno = await CrearUnoAsync(Guid.NewGuid(), id: id);

        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion(id: id));

        Assert.Equal(EstadoDeDiseno.IdentificadorEnUso, resultado.Estado);
        Assert.Null(resultado.Diseno);
        Assert.Same(ajeno, Assert.Single(_disenos.Todos));
    }

    [Fact]
    public async Task CrearConIdVacio_DevuelveIdentificadorNoValido()
    {
        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion(id: Guid.Empty));

        Assert.Equal(EstadoDeDiseno.IdentificadorNoValido, resultado.Estado);
        Assert.Empty(_disenos.Todos);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    /// <summary>
    /// Un reintento del alta que llegó a guardarse no debe chocar con el límite: el
    /// diseño ya cuenta entre los cien, y responder 409 haría creer que no se guardó.
    /// </summary>
    [Fact]
    public async Task ReintentoConCienDisenos_DevuelveYaCreadoYNoLimite()
    {
        var id = Guid.NewGuid();
        var reintentado = await CrearUnoAsync(nombre: "D0", id: id);
        for (var i = 1; i < Diseno.MaximoPorUsuario; i++)
        {
            await CrearUnoAsync(nombre: $"D{i}");
        }

        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion("D0", id: id));

        Assert.Equal(EstadoDeDiseno.YaCreado, resultado.Estado);
        Assert.Same(reintentado, resultado.Diseno);
        Assert.Equal(Diseno.MaximoPorUsuario, _disenos.Todos.Count);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Actualizar_ConLaVersionCorrecta_SubeLaVersion()
    {
        var diseno = await CrearUnoAsync();

        var resultado = await CasoDeUso.ActualizarAsync(
            _usuario, diseno.Id, 1, Peticion("Cocina", "cocina", OtroContenido));

        Assert.Equal(EstadoDeDiseno.Correcto, resultado.Estado);
        Assert.Equal(2, resultado.Diseno!.Version);
        Assert.Equal("Cocina", resultado.Diseno.Nombre.Valor);
        Assert.Equal(1, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Actualizar_ConVersionVieja_VersionDistintaSinCambios()
    {
        var diseno = await CrearUnoAsync();
        await CasoDeUso.ActualizarAsync(_usuario, diseno.Id, 1, Peticion("Cocina", "cocina"));
        _guardadosPrevios = _disenos.GuardadosSolicitados;

        var resultado = await CasoDeUso.ActualizarAsync(_usuario, diseno.Id, 1, Peticion("Otro", "dormitorio"));

        Assert.Equal(EstadoDeDiseno.VersionDistinta, resultado.Estado);
        Assert.Same(diseno, resultado.Diseno);
        Assert.Equal(2, diseno.Version);
        Assert.Equal("Cocina", diseno.Nombre.Valor);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Actualizar_PeticionNoValida_SeValidaAntesQueLaVersion()
    {
        var diseno = await CrearUnoAsync();

        var resultado = await CasoDeUso.ActualizarAsync(_usuario, diseno.Id, 99, Peticion(tipo: "baño"));

        Assert.Equal(EstadoDeDiseno.TipoNoValido, resultado.Estado);
        Assert.Equal(1, diseno.Version);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Actualizar_ContenidoRoto_ContenidoNoValidoConElDetalle()
    {
        var diseno = await CrearUnoAsync();

        var resultado = await CasoDeUso.ActualizarAsync(_usuario, diseno.Id, 1, Peticion(contenido: ""));

        Assert.Equal(EstadoDeDiseno.ContenidoNoValido, resultado.Estado);
        Assert.NotNull(resultado.Contenido);
        Assert.Equal(1, diseno.Version);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Actualizar_NombreEnBlanco_NombreNoValido()
    {
        var diseno = await CrearUnoAsync();

        var resultado = await CasoDeUso.ActualizarAsync(_usuario, diseno.Id, 1, Peticion(nombre: ""));

        Assert.Equal(EstadoDeDiseno.NombreNoValido, resultado.Estado);
        Assert.Equal("Salón", diseno.Nombre.Valor);
    }

    [Fact]
    public async Task Actualizar_DisenoAjeno_NoEncontradoEIntacto()
    {
        var ajeno = await CrearUnoAsync(Guid.NewGuid());

        var resultado = await CasoDeUso.ActualizarAsync(_usuario, ajeno.Id, 1, Peticion("Cocina", "cocina"));

        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
        Assert.Equal(1, ajeno.Version);
        Assert.Equal("Salón", ajeno.Nombre.Valor);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Actualizar_NoExiste_NoEncontradoAunqueLaPeticionSeaNoValida()
    {
        var resultado = await CasoDeUso.ActualizarAsync(_usuario, Guid.NewGuid(), 1, Peticion(tipo: "baño"));

        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
    }

    [Fact]
    public async Task Duplicar_AnadeCopiaEnVersion1()
    {
        var diseno = await CrearUnoAsync();

        var resultado = await CasoDeUso.DuplicarAsync(_usuario, diseno.Id);

        Assert.Equal(EstadoDeDiseno.Correcto, resultado.Estado);
        Assert.Equal("Salón (copia)", resultado.Diseno!.Nombre.Valor);
        Assert.Equal(1, resultado.Diseno.Version);
        Assert.NotEqual(diseno.Id, resultado.Diseno.Id);
        Assert.Equal(2, _disenos.Todos.Count);
        Assert.Equal(1, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Duplicar_DisenoAjeno_NoEncontrado()
    {
        var ajeno = await CrearUnoAsync(Guid.NewGuid());

        var resultado = await CasoDeUso.DuplicarAsync(_usuario, ajeno.Id);

        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
        Assert.Single(_disenos.Todos);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Duplicar_ConCienDisenos_LimiteAlcanzado()
    {
        var primero = await CrearUnoAsync(nombre: "D0");
        for (var i = 1; i < Diseno.MaximoPorUsuario; i++)
        {
            await CrearUnoAsync(nombre: $"D{i}");
        }

        var resultado = await CasoDeUso.DuplicarAsync(_usuario, primero.Id);

        Assert.Equal(EstadoDeDiseno.LimiteAlcanzado, resultado.Estado);
        Assert.Equal(Diseno.MaximoPorUsuario, _disenos.Todos.Count);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Borrar_DisenoPropio_DevuelveTrueYGuardaUnaVez()
    {
        var diseno = await CrearUnoAsync();

        var borrado = await CasoDeUso.BorrarAsync(_usuario, diseno.Id);

        Assert.True(borrado);
        Assert.Empty(_disenos.Todos);
        Assert.Equal(1, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task Borrar_SiOtroSeAdelantaAlGuardar_DevuelveFalse()
    {
        var diseno = await CrearUnoAsync();
        _disenos.Carrera = () => { };

        Assert.False(await CasoDeUso.BorrarAsync(_usuario, diseno.Id));
    }

    [Fact]
    public async Task Actualizar_SiOtroLoBorraAntesDeGuardar_NoEncontrado()
    {
        var diseno = await CrearUnoAsync();
        _disenos.Carrera = () => _disenos.Quitar(diseno);

        var resultado = await CasoDeUso.ActualizarAsync(_usuario, diseno.Id, 1, Peticion("Otro"));

        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
    }

    [Fact]
    public async Task Crear_SiLaCuentaDesapareceAlGuardar_NoEncontrado()
    {
        _disenos.Carrera = () => { };

        var resultado = await CasoDeUso.CrearAsync(_usuario, Peticion());

        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
        Assert.Null(resultado.Diseno);
    }

    [Fact]
    public async Task Borrar_DisenoAjeno_DevuelveFalseYLoDejaIntacto()
    {
        var ajeno = await CrearUnoAsync(Guid.NewGuid());

        var borrado = await CasoDeUso.BorrarAsync(_usuario, ajeno.Id);

        Assert.False(borrado);
        Assert.Single(_disenos.Todos);
        Assert.Equal(0, GuardadosDeLaOperacion);
    }

    [Fact]
    public async Task ListarYObtener_SoloDevuelvenLosPropios()
    {
        var propio = await CrearUnoAsync();
        var ajeno = await CrearUnoAsync(Guid.NewGuid());

        var lista = await CasoDeUso.ListarAsync(_usuario);

        Assert.Equal(propio.Id, Assert.Single(lista).Id);
        Assert.Same(propio, await CasoDeUso.ObtenerAsync(_usuario, propio.Id));
        Assert.Null(await CasoDeUso.ObtenerAsync(_usuario, ajeno.Id));
    }
}
