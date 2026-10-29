using Decorazon.Aplicacion.Disenos;
using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Persistencia;
using Decorazon.Infraestructura.Tiempo;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Tests.Persistencia;

/// <summary>
/// Carreras reales contra PostgreSQL, a nivel de caso de uso: otro contexto escribe
/// entre la lectura y el guardado (<see cref="CarreraAntesDeGuardar"/>). Ninguna
/// debe acabar en una excepción de EF o de Npgsql: el adaptador las traduce a un
/// resultado del puerto y el caso de uso responde lo que corresponde.
/// </summary>
[Collection(ColeccionPostgres.Nombre)]
[Trait("Categoria", "Integracion")]
public sealed class CarrerasConPostgresTests(PostgresFixture postgres)
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 25, 12, 0, 0, TimeSpan.Zero);

    private const string Json =
        """{"formato":1,"estancia":{"ancho":400},"aberturas":[],"estructura":[],"elementos":[]}""";

    private static PeticionDeDiseno Peticion(string nombre) => new(nombre, "salon", Json);

    private async Task<(string Cadena, Usuario Usuario, Diseno Diseno)> BaseConDisenoAsync()
    {
        var cadena = await postgres.NuevaBaseAsync();
        var usuario = Usuario.Crear(
            CorreoElectronico.Crear("ana@example.com"), NombreDeUsuario.Crear("Ana"), "hash", Ahora);
        ContenidoDeDiseno.Validar(Json, out var contenido);
        NombreDeDiseno.TryCrear("Original", out var nombre);
        var diseno = Diseno.Crear(usuario.Id, nombre, TipoDeEstancia.Salon, contenido!, Ahora);

        await using var contexto = PostgresFixture.Contexto(cadena);
        contexto.Usuarios.Add(usuario);
        contexto.Disenos.Add(diseno);
        await contexto.SaveChangesAsync();

        return (cadena, usuario, diseno);
    }

    private static GestionDeDisenos Gestion(DecorazonDbContext contexto) =>
        new(new RepositorioDeDisenosEf(contexto), new RelojDelSistema());

    // ------------------------------------------------------------ Actualizar

    [Fact]
    public async Task Actualizar_si_otro_lo_cambia_entre_leer_y_guardar_devuelve_VersionDistinta_con_el_actual()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(async () =>
        {
            await using var otro = PostgresFixture.Contexto(cadena);
            var resultadoDelOtro = await Gestion(otro).ActualizarAsync(usuario.Id, diseno.Id, 1, Peticion("Del otro"));
            Assert.Equal(EstadoDeDiseno.Correcto, resultadoDelOtro.Estado);
        });
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Gestion(contexto).ActualizarAsync(usuario.Id, diseno.Id, 1, Peticion("Mío"));

        Assert.True(carrera.Ocurrio);
        Assert.Equal(EstadoDeDiseno.VersionDistinta, resultado.Estado);
        Assert.Equal(2, resultado.Diseno!.Version);
        Assert.Equal("Del otro", resultado.Diseno.Nombre.Valor);

        await using var lectura = PostgresFixture.Contexto(cadena);
        var guardado = await lectura.Disenos.SingleAsync();
        Assert.Equal("Del otro", guardado.Nombre.Valor);
        Assert.Equal(2, guardado.Version);
    }

    [Fact]
    public async Task Actualizar_si_otro_lo_borra_entre_leer_y_guardar_devuelve_NoEncontrado()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(() => BorrarDisenosAsync(cadena));
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Gestion(contexto).ActualizarAsync(usuario.Id, diseno.Id, 1, Peticion("Mío"));

        Assert.True(carrera.Ocurrio);
        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
    }

    // ------------------------------------------------------------ Borrar

    [Fact]
    public async Task Borrar_si_otro_lo_borra_antes_devuelve_false()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(() => BorrarDisenosAsync(cadena));
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        Assert.False(await Gestion(contexto).BorrarAsync(usuario.Id, diseno.Id));
        Assert.True(carrera.Ocurrio);
    }

    [Fact]
    public async Task Borrar_si_otro_lo_cambia_antes_devuelve_false_y_no_lo_borra()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(async () =>
        {
            await using var otro = PostgresFixture.Contexto(cadena);
            await Gestion(otro).ActualizarAsync(usuario.Id, diseno.Id, 1, Peticion("Del otro"));
        });
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        Assert.False(await Gestion(contexto).BorrarAsync(usuario.Id, diseno.Id));

        await using var lectura = PostgresFixture.Contexto(cadena);
        Assert.Equal("Del otro", (await lectura.Disenos.SingleAsync()).Nombre.Valor);
    }

    // ------------------------------------------------- Crear con la cuenta borrándose

    [Fact]
    public async Task Crear_si_la_cuenta_se_borra_entre_contar_y_guardar_devuelve_NoEncontrado()
    {
        var (cadena, usuario, _) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(() => BorrarUsuariosAsync(cadena));
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Gestion(contexto).CrearAsync(usuario.Id, Peticion("Nuevo"));

        Assert.True(carrera.Ocurrio);
        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
    }

    [Fact]
    public async Task Duplicar_si_la_cuenta_se_borra_entre_leer_y_guardar_devuelve_NoEncontrado()
    {
        var (cadena, usuario, diseno) = await BaseConDisenoAsync();
        var carrera = new CarreraAntesDeGuardar(() => BorrarUsuariosAsync(cadena));
        await using var contexto = PostgresFixture.Contexto(cadena, carrera);

        var resultado = await Gestion(contexto).DuplicarAsync(usuario.Id, diseno.Id);

        Assert.Equal(EstadoDeDiseno.NoEncontrado, resultado.Estado);
    }

    private static async Task BorrarDisenosAsync(string cadena)
    {
        await using var otro = PostgresFixture.Contexto(cadena);
        await otro.Disenos.ExecuteDeleteAsync();
    }

    private static async Task BorrarUsuariosAsync(string cadena)
    {
        await using var otro = PostgresFixture.Contexto(cadena);
        await otro.Usuarios.ExecuteDeleteAsync();
    }
}
