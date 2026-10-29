using Decorazon.Dominio.Puertos;
using Decorazon.Infraestructura.Correo;
using Decorazon.Infraestructura.Persistencia;
using Decorazon.Infraestructura.Seguridad;
using Decorazon.Infraestructura.Tiempo;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Decorazon.Infraestructura;

public static class InyeccionDeDependencias
{
    /// <summary>
    /// Cómo habla EF con PostgreSQL: Npgsql y nombres en snake_case. Un solo
    /// sitio para la API y para las herramientas de EF (la fábrica de tiempo de
    /// diseño que usa el bundle de migraciones): si divergieran, las
    /// migraciones verían otro modelo.
    /// </summary>
    public static DbContextOptionsBuilder UsarPostgres(this DbContextOptionsBuilder opciones, string cadena) =>
        opciones.UseNpgsql(cadena).UseSnakeCaseNamingConvention();

    public static IServiceCollection AddInfraestructura(
        this IServiceCollection servicios,
        IConfiguration configuracion)
    {
        var cadena = configuracion.GetConnectionString("Decorazon")
            ?? throw new InvalidOperationException(
                "Falta ConnectionStrings:Decorazon. Copia appsettings.Example.json como " +
                "appsettings.Development.json y pon tus valores.");

        servicios.AddDbContext<DecorazonDbContext>(opciones =>
            opciones.UsarPostgres(cadena));

        servicios.AddScoped<IComprobadorDeAlmacen, ComprobadorDeAlmacenEf>();
        servicios.AddScoped<IRepositorioDeUsuarios, RepositorioDeUsuariosEf>();
        servicios.AddScoped<IRepositorioDeSolicitudesDeRegistro, RepositorioDeSolicitudesDeRegistroEf>();
        servicios.AddScoped<IRepositorioDeSolicitudesDeContrasena, RepositorioDeSolicitudesDeContrasenaEf>();
        servicios.AddScoped<IRepositorioDeDisenos, RepositorioDeDisenosEf>();
        servicios.AddScoped<IBorradoDeCuentas, BorradoDeCuentasEf>();
        servicios.AddScoped<ILimpiezaDeCaducados, LimpiezaDeCaducadosEf>();

        servicios.AddSingleton<IReloj, RelojDelSistema>();
        servicios.AddSingleton<IHasheadorDeContrasenas, HasheadorPbkdf2>();
        servicios.AddSingleton<IGeneradorDeTokens, GeneradorDeTokensAleatorios>();
        servicios.AddScoped<IEmisorDeAcceso, EmisorDeAccesoJwt>();

        AnadirOpcionesDeJwt(servicios, configuracion);
        AnadirCorreo(servicios, configuracion);

        return servicios;
    }

    private static void AnadirOpcionesDeJwt(IServiceCollection servicios, IConfiguration configuracion)
    {
        var opciones = new OpcionesDeJwt();
        configuracion.GetSection(OpcionesDeJwt.Seccion).Bind(opciones);

        // Se valida al arrancar, no en la primera petición: un despliegue con la
        // clave de firma ausente o demasiado corta no debe llegar a atender tráfico.
        opciones.Validar();

        servicios.Configure<OpcionesDeJwt>(configuracion.GetSection(OpcionesDeJwt.Seccion));
    }

    private static void AnadirCorreo(IServiceCollection servicios, IConfiguration configuracion)
    {
        var opciones = new OpcionesDeCorreo();
        configuracion.GetSection(OpcionesDeCorreo.Seccion).Bind(opciones);
        opciones.Validar();

        servicios.Configure<OpcionesDeCorreo>(configuracion.GetSection(OpcionesDeCorreo.Seccion));

        if (!opciones.UsarBrevo)
        {
            // Por defecto no se envía correo real. Brevo exige activación explícita.
            servicios.AddScoped<IEnviadorDeCorreo, EnviadorDeCorreoDeConsola>();
            return;
        }

        servicios.AddHttpClient<IEnviadorDeCorreo, EnviadorDeCorreoBrevo>(cliente =>
        {
            cliente.BaseAddress = new Uri("https://api.brevo.com/");
            cliente.DefaultRequestHeaders.Add("api-key", opciones.ClaveDeApi);
            cliente.DefaultRequestHeaders.Add("accept", "application/json");
            cliente.Timeout = TimeSpan.FromSeconds(15);
        });
    }
}
