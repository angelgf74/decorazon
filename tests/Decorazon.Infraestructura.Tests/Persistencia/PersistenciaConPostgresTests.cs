using System.Text.Json;
using Decorazon.Aplicacion.Registro;
using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Persistencia;
using Decorazon.Infraestructura.Seguridad;
using Decorazon.Infraestructura.Tiempo;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Tests.Persistencia;

[Collection(ColeccionPostgres.Nombre)]
[Trait("Categoria", "Integracion")]
public sealed class PersistenciaConPostgresTests(PostgresFixture postgres)
{
    private static readonly DateTimeOffset Ahora = new(2026, 10, 25, 12, 0, 0, TimeSpan.Zero);

    private const string JsonBase =
        """{"formato":1,"estancia":{"ancho":400,"alto":300},"aberturas":[],"estructura":[],"elementos":[{"id":"a","x":1}]}""";

    private static ContenidoDeDiseno Contenido(string json = JsonBase)
    {
        Assert.Equal(ResultadoDeContenido.Valido, ContenidoDeDiseno.Validar(json, out var contenido));
        return contenido!;
    }

    private static NombreDeDiseno Nombre(string texto = "Mi salón")
    {
        Assert.True(NombreDeDiseno.TryCrear(texto, out var nombre));
        return nombre;
    }

    private static Usuario NuevoUsuario(string correo = "ana@example.com") =>
        Usuario.Crear(CorreoElectronico.Crear(correo), NombreDeUsuario.Crear("Ana"), "hash", Ahora);

    private async Task<(string Cadena, Usuario Usuario)> BaseConUsuarioAsync(string correo = "ana@example.com")
    {
        var cadena = await postgres.NuevaBaseAsync();
        var usuario = NuevoUsuario(correo);
        await using var contexto = PostgresFixture.Contexto(cadena);
        await new RepositorioDeUsuariosEf(contexto).AnadirAsync(usuario);
        return (cadena, usuario);
    }

    [Fact]
    public async Task Un_diseno_guardado_se_lee_con_el_mismo_contenido_aunque_jsonb_lo_normalice()
    {
        var (cadena, usuario) = await BaseConUsuarioAsync();
        var diseno = Diseno.Crear(usuario.Id, Nombre(), TipoDeEstancia.Salon, Contenido(), Ahora);

        await using (var contexto = PostgresFixture.Contexto(cadena))
        {
            var repositorio = new RepositorioDeDisenosEf(contexto);
            repositorio.Anadir(diseno);
            await repositorio.GuardarCambiosAsync();
        }

        await using var lectura = PostgresFixture.Contexto(cadena);
        var leido = await new RepositorioDeDisenosEf(lectura).ObtenerAsync(usuario.Id, diseno.Id);

        Assert.NotNull(leido);
        Assert.Equal("Mi salón", leido.Nombre.Valor);
        Assert.Equal(TipoDeEstancia.Salon, leido.Tipo);
        Assert.Equal(1, leido.Version);
        using var esperado = JsonDocument.Parse(JsonBase);
        using var real = JsonDocument.Parse(leido.Contenido.Json);
        Assert.True(JsonElement.DeepEquals(esperado.RootElement, real.RootElement));
    }

    [Fact]
    public async Task Tipo_y_contenido_se_guardan_como_texto_y_jsonb()
    {
        var (cadena, usuario) = await BaseConUsuarioAsync();
        await using var contexto = PostgresFixture.Contexto(cadena);
        contexto.Disenos.Add(Diseno.Crear(usuario.Id, Nombre(), TipoDeEstancia.Cocina, Contenido(), Ahora));
        await contexto.SaveChangesAsync();

        var columnas = await contexto.Database
            .SqlQuery<string>($"SELECT tipo || '|' || pg_typeof(contenido)::text AS \"Value\" FROM disenos")
            .SingleAsync();

        Assert.Equal("cocina|jsonb", columnas);
    }

    [Fact]
    public async Task Dos_guardados_simultaneos_del_mismo_diseno_no_se_pisan()
    {
        var (cadena, usuario) = await BaseConUsuarioAsync();
        await using (var contexto = PostgresFixture.Contexto(cadena))
        {
            contexto.Disenos.Add(Diseno.Crear(usuario.Id, Nombre(), TipoDeEstancia.Salon, Contenido(), Ahora));
            await contexto.SaveChangesAsync();
        }

        await using var primero = PostgresFixture.Contexto(cadena);
        await using var segundo = PostgresFixture.Contexto(cadena);
        var delPrimero = await primero.Disenos.SingleAsync();
        var delSegundo = await segundo.Disenos.SingleAsync();

        delPrimero.Actualizar(Nombre("Primero"), TipoDeEstancia.Salon, Contenido(), Ahora.AddMinutes(1));
        delSegundo.Actualizar(Nombre("Segundo"), TipoDeEstancia.Salon, Contenido(), Ahora.AddMinutes(2));

        await primero.SaveChangesAsync();
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => segundo.SaveChangesAsync());

        await using var lectura = PostgresFixture.Contexto(cadena);
        var guardado = await lectura.Disenos.SingleAsync();
        Assert.Equal("Primero", guardado.Nombre.Valor);
        Assert.Equal(2, guardado.Version);
    }

    [Fact]
    public async Task Un_diseno_ajeno_no_se_obtiene_y_el_listado_va_del_mas_reciente_al_mas_antiguo()
    {
        var (cadena, ana) = await BaseConUsuarioAsync();
        var luis = NuevoUsuario("luis@example.com");
        await using var contexto = PostgresFixture.Contexto(cadena);
        await new RepositorioDeUsuariosEf(contexto).AnadirAsync(luis);

        var repositorio = new RepositorioDeDisenosEf(contexto);
        var deLuis = Diseno.Crear(luis.Id, Nombre("De Luis"), TipoDeEstancia.Salon, Contenido(), Ahora);
        repositorio.Anadir(Diseno.Crear(ana.Id, Nombre("Viejo"), TipoDeEstancia.Salon, Contenido(), Ahora));
        repositorio.Anadir(Diseno.Crear(ana.Id, Nombre("Nuevo"), TipoDeEstancia.Salon, Contenido(), Ahora.AddHours(1)));
        repositorio.Anadir(deLuis);
        await repositorio.GuardarCambiosAsync();

        Assert.Null(await repositorio.ObtenerAsync(ana.Id, deLuis.Id));
        Assert.Equal(2, await repositorio.ContarAsync(ana.Id));
        Assert.Equal(["Nuevo", "Viejo"], (await repositorio.ListarAsync(ana.Id)).Select(d => d.Nombre.Valor));
    }

    [Fact]
    public async Task Postgres_rechaza_un_escape_de_sustituto_suelto_en_jsonb_por_eso_el_dominio_lo_filtra()
    {
        var cadena = await postgres.NuevaBaseAsync();
        await using var contexto = PostgresFixture.Contexto(cadena);

        // Texto con el escape (no el carácter), enviado como parámetro como en un guardado.
        var json = """{"nota":"\uD800"}""";
        var excepcion = await Assert.ThrowsAsync<Npgsql.PostgresException>(() =>
            contexto.Database
                .SqlQuery<string>($"SELECT CAST({json} AS jsonb)::text AS \"Value\"")
                .ToListAsync());

        Assert.Equal("22P02", excepcion.SqlState);  // invalid_text_representation
    }

    [Fact]
    public void Un_escape_de_sustituto_suelto_en_el_contenido_no_llega_a_la_base_de_datos()
    {
        // El texto \uD800 (escape, no el carácter) lo rechaza jsonb de PostgreSQL:
        // el dominio lo detecta antes, así que nunca se intenta guardar.
        var json = """{"formato":1,"estancia":{"nota":"\uD800"},"aberturas":[],"estructura":[],"elementos":[]}""";

        var resultado = ContenidoDeDiseno.Validar(json, out var contenido);

        Assert.Equal(ResultadoDeContenido.NoEsJson, resultado);
        Assert.Null(contenido);
    }

    [Fact]
    public async Task Completar_el_registro_crea_usuario_y_diseno_y_deja_la_solicitud_consumida_sin_diseno()
    {
        var cadena = await postgres.NuevaBaseAsync();
        var tokens = new GeneradorDeTokensAleatorios();
        var reloj = new RelojDelSistema();
        var token = tokens.GenerarToken();
        var correo = CorreoElectronico.Crear("nueva@example.com");

        // La solicitud se crea "ahora" de verdad: Completar usa el reloj del sistema.
        await using (var contexto = PostgresFixture.Contexto(cadena))
        {
            var pendiente = new DisenoPendiente(Nombre("Mi dormitorio"), TipoDeEstancia.Dormitorio, Contenido());
            var solicitud = SolicitudDeRegistro.Crear(correo, tokens.Hashear(token), pendiente, reloj.Ahora);
            await new RepositorioDeSolicitudesDeRegistroEf(contexto).AnadirAsync(solicitud);
        }

        await using (var contexto = PostgresFixture.Contexto(cadena))
        {
            var caso = new CompletarRegistro(
                new RepositorioDeUsuariosEf(contexto),
                new RepositorioDeDisenosEf(contexto),
                new RepositorioDeSolicitudesDeRegistroEf(contexto),
                tokens,
                new HasheadorPbkdf2(),
                reloj);

            var resultado = await caso.EjecutarAsync(token, "Nueva", "una contraseña larga");
            Assert.Equal(ResultadoDeCompletarRegistro.Completado, resultado);
        }

        await using var lectura = PostgresFixture.Contexto(cadena);
        var usuario = await lectura.Usuarios.SingleAsync();
        var diseno = await lectura.Disenos.SingleAsync();
        var consumida = await lectura.SolicitudesDeRegistro.SingleAsync();

        Assert.Equal(correo, usuario.Correo);
        Assert.Equal(usuario.Id, diseno.UsuarioId);
        Assert.Equal("Mi dormitorio", diseno.Nombre.Valor);
        Assert.Equal(TipoDeEstancia.Dormitorio, diseno.Tipo);
        Assert.True(consumida.EstaConsumida);
        Assert.Null(consumida.Diseno);
    }

    [Fact]
    public async Task Una_solicitud_con_y_sin_diseno_se_guarda_y_se_lee()
    {
        var cadena = await postgres.NuevaBaseAsync();
        var con = SolicitudDeRegistro.Crear(
            CorreoElectronico.Crear("a@example.com"), "h1",
            new DisenoPendiente(Nombre(), TipoDeEstancia.Cocina, Contenido()), Ahora);
        var sin = SolicitudDeRegistro.Crear(CorreoElectronico.Crear("b@example.com"), "h2", null, Ahora);

        await using (var contexto = PostgresFixture.Contexto(cadena))
        {
            var repositorio = new RepositorioDeSolicitudesDeRegistroEf(contexto);
            await repositorio.AnadirAsync(con);
            await repositorio.AnadirAsync(sin);
        }

        await using var lectura = PostgresFixture.Contexto(cadena);
        var repositorioDeLectura = new RepositorioDeSolicitudesDeRegistroEf(lectura);
        var leidaCon = await repositorioDeLectura.BuscarPorHashDelTokenAsync("h1");
        var leidaSin = await repositorioDeLectura.BuscarPorHashDelTokenAsync("h2");

        Assert.NotNull(leidaCon?.Diseno);
        Assert.Equal(TipoDeEstancia.Cocina, leidaCon.Diseno.Tipo);
        Assert.Equal("Mi salón", leidaCon.Diseno.Nombre.Valor);
        Assert.Null(leidaSin!.Diseno);
    }

    [Fact]
    public async Task Contar_las_solicitudes_creadas_cuenta_por_correo_y_desde_la_fecha()
    {
        var cadena = await postgres.NuevaBaseAsync();
        var correo = CorreoElectronico.Crear("a@example.com");
        await using var contexto = PostgresFixture.Contexto(cadena);
        var repositorio = new RepositorioDeSolicitudesDeRegistroEf(contexto);

        await repositorio.AnadirAsync(SolicitudDeRegistro.Crear(correo, "h1", null, Ahora.AddMinutes(-90)));
        await repositorio.AnadirAsync(SolicitudDeRegistro.Crear(correo, "h2", null, Ahora.AddMinutes(-30)));
        await repositorio.AnadirAsync(SolicitudDeRegistro.Crear(correo, "h3", null, Ahora));
        await repositorio.AnadirAsync(SolicitudDeRegistro.Crear(CorreoElectronico.Crear("b@example.com"), "h4", null, Ahora));

        Assert.Equal(2, await repositorio.ContarCreadasDesdeAsync(correo, Ahora.AddHours(-1)));
        Assert.Equal(3, await repositorio.ContarCreadasDesdeAsync(correo, Ahora.AddHours(-2)));
    }

    [Fact]
    public async Task Borrar_una_cuenta_borra_en_una_transaccion_sus_disenos_y_el_usuario()
    {
        var (cadena, usuario) = await BaseConUsuarioAsync();
        var otro = NuevoUsuario("otro@example.com");
        await using var contexto = PostgresFixture.Contexto(cadena);
        await new RepositorioDeUsuariosEf(contexto).AnadirAsync(otro);
        contexto.Disenos.Add(Diseno.Crear(usuario.Id, Nombre("Uno"), TipoDeEstancia.Salon, Contenido(), Ahora));
        contexto.Disenos.Add(Diseno.Crear(usuario.Id, Nombre("Dos"), TipoDeEstancia.Cocina, Contenido(), Ahora));
        contexto.Disenos.Add(Diseno.Crear(otro.Id, Nombre("Ajeno"), TipoDeEstancia.Salon, Contenido(), Ahora));
        contexto.SolicitudesDeRegistro.Add(SolicitudDeRegistro.Crear(usuario.Correo, "h1", null, Ahora));
        await contexto.SaveChangesAsync();

        await new BorradoDeCuentasEf(contexto).BorrarAsync(usuario.Id, usuario.Correo);

        await using var lectura = PostgresFixture.Contexto(cadena);
        Assert.Equal(0, await lectura.Disenos.CountAsync(d => d.UsuarioId == usuario.Id));
        Assert.Equal(0, await lectura.Usuarios.CountAsync(u => u.Id == usuario.Id));
        Assert.Equal(0, await lectura.SolicitudesDeRegistro.CountAsync());
        Assert.Equal(1, await lectura.Disenos.CountAsync(d => d.UsuarioId == otro.Id));
        Assert.Equal(1, await lectura.Usuarios.CountAsync(u => u.Id == otro.Id));
    }

    [Fact]
    public async Task Borrar_un_usuario_directamente_arrastra_sus_disenos_por_la_cascada()
    {
        var (cadena, usuario) = await BaseConUsuarioAsync();
        await using var contexto = PostgresFixture.Contexto(cadena);
        contexto.Disenos.Add(Diseno.Crear(usuario.Id, Nombre(), TipoDeEstancia.Salon, Contenido(), Ahora));
        await contexto.SaveChangesAsync();

        await contexto.Usuarios.Where(u => u.Id == usuario.Id).ExecuteDeleteAsync();

        Assert.Equal(0, await contexto.Disenos.CountAsync());
    }

    [Fact]
    public async Task Descartar_disenos_caducados_vacia_solo_las_solicitudes_caducadas_que_aun_tienen_diseno()
    {
        var cadena = await postgres.NuevaBaseAsync();
        var diseno = new DisenoPendiente(Nombre(), TipoDeEstancia.Salon, Contenido());
        var caducada = SolicitudDeRegistro.Crear(CorreoElectronico.Crear("a@example.com"), "h1", diseno, Ahora.AddDays(-2));
        var vigente = SolicitudDeRegistro.Crear(CorreoElectronico.Crear("b@example.com"), "h2", diseno, Ahora);
        var caducadaSinDiseno = SolicitudDeRegistro.Crear(CorreoElectronico.Crear("c@example.com"), "h3", null, Ahora.AddDays(-2));

        await using var contexto = PostgresFixture.Contexto(cadena);
        contexto.SolicitudesDeRegistro.AddRange(caducada, vigente, caducadaSinDiseno);
        await contexto.SaveChangesAsync();

        var descartados = await new LimpiezaDeCaducadosEf(contexto).DescartarDisenosCaducadosAsync(Ahora);

        Assert.Equal(1, descartados);
        await using var lectura = PostgresFixture.Contexto(cadena);
        var solicitudes = await lectura.SolicitudesDeRegistro.ToListAsync();
        Assert.Equal(3, solicitudes.Count);
        Assert.Null(solicitudes.Single(s => s.HashDelToken == "h1").Diseno);
        Assert.NotNull(solicitudes.Single(s => s.HashDelToken == "h2").Diseno);
        Assert.Equal(0, await new LimpiezaDeCaducadosEf(lectura).DescartarDisenosCaducadosAsync(Ahora));
    }

    [Fact]
    public async Task Borrar_terminadas_borra_solo_las_caducadas_y_deja_las_vigentes()
    {
        var cadena = await postgres.NuevaBaseAsync();
        var vieja = SolicitudDeRegistro.Crear(CorreoElectronico.Crear("a@example.com"), "h1", null, Ahora.AddDays(-5));
        var vigente = SolicitudDeRegistro.Crear(CorreoElectronico.Crear("b@example.com"), "h2", null, Ahora);
        await using var contexto = PostgresFixture.Contexto(cadena);
        contexto.SolicitudesDeRegistro.AddRange(vieja, vigente);
        await contexto.SaveChangesAsync();

        var resultado = await new LimpiezaDeCaducadosEf(contexto).BorrarTerminadasAntesDeAsync(Ahora.AddDays(-1));

        Assert.Equal(1, resultado.SolicitudesDeAlta);
        Assert.Equal(1, await contexto.SolicitudesDeRegistro.CountAsync());
    }

    [Fact]
    public async Task El_comprobador_de_almacen_responde_con_la_base_viva()
    {
        var cadena = await postgres.NuevaBaseAsync();
        await using var contexto = PostgresFixture.Contexto(cadena);

        Assert.True(await new ComprobadorDeAlmacenEf(contexto).RespondeAsync());
    }
}
