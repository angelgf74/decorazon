using System.Net;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Decorazon.Api.Endpoints;
using Decorazon.Api.OpenApi;
using Decorazon.Api.Tareas;
using Decorazon.Aplicacion;
using Decorazon.Dominio.Puertos;
using Decorazon.Infraestructura;
using Decorazon.Infraestructura.Correo;
using Decorazon.Infraestructura.Persistencia;
using Decorazon.Infraestructura.Seguridad;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

var constructor = WebApplication.CreateBuilder(args);

constructor.Host.UseSystemd();

// dotnet build arranca la API dentro de GetDocument.Insider solo para leer el
// documento OpenAPI. El host no se detiene en Build(): la app sigue con un
// servidor que no atiende peticiones, por eso se omite la migración de
// Development (no hay base) y Limpieza:Activa=false evita la tarea de limpieza.
// Ahí no hay secretos (el entorno lo hereda del build), y las validaciones de
// arranque impedirían generar el documento.
// Estos valores ficticios no afectan al documento y no firman ni conectan con
// nada; se añaden los últimos para que tampoco se lea ningún secreto real.
// Fuera de ese proceso no se tocan: la API real sigue sin arrancar sin ellos.
var soloDocumentoOpenApi = Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider";
if (soloDocumentoOpenApi)
{
    constructor.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["ConnectionStrings:Decorazon"] = "Host=localhost;Database=solo-documento-openapi",
        ["Jwt:ClaveDeFirma"] = "solo-para-generar-el-documento-openapi-no-firma-nada",
        ["Correo:UsarBrevo"] = "false",
        ["Correo:Simulado"] = "true",
        ["Limpieza:Activa"] = "false"
    });
}

constructor.Services
    .AddAplicacion()
    .AddInfraestructura(constructor.Configuration);

constructor.Services.AnadirLimitesDePeticiones(constructor.Configuration);

// En un despliegue, el correo tiene que salir de verdad y los enlaces apuntar a la web
// pública en https. Si no, el alta y el olvido de contraseña no funcionan para nadie y
// ningún error lo delata: mejor no arrancar. Development y los tests (entorno Testing)
// usan el correo simulado y la web local a propósito.
if (!constructor.Environment.IsDevelopment() && !constructor.Environment.IsEnvironment("Testing"))
{
    var opcionesDeCorreo = new OpcionesDeCorreo();
    constructor.Configuration.GetSection(OpcionesDeCorreo.Seccion).Bind(opcionesDeCorreo);
    opcionesDeCorreo.ValidarFueraDeDesarrollo();
}

// Documento OpenAPI en /openapi/v1.json: el contrato del que sale el cliente de
// la web. El build lo escribe también en web/src/api/openapi.json.
constructor.Services.AddOpenApi(opciones => opciones.AnadirTransformadoresDeDecorazon());

// Los números son números: con la tolerancia por defecto de la web (leerlos
// también de cadenas), el documento describe cada entero como "integer o string".
constructor.Services.ConfigureHttpJsonOptions(opciones =>
    opciones.SerializerOptions.NumberHandling = JsonNumberHandling.Strict);

// Las DataAnnotations de los contratos se aplican antes del endpoint; sus 400,
// como los del JSON mal formado, con el cuerpo de siempre.
constructor.Services.AnadirValidacion();
constructor.Services.AnadirMensajeEnPeticionesNoValidas();

var opcionesDeJwt = new OpcionesDeJwt();
constructor.Configuration.GetSection(OpcionesDeJwt.Seccion).Bind(opcionesDeJwt);
opcionesDeJwt.Validar();

constructor.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opciones =>
    {
        opciones.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = opcionesDeJwt.Emisor,
            ValidateAudience = true,
            ValidAudience = opcionesDeJwt.Audiencia,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opcionesDeJwt.ClaveDeFirma)),
            ValidateLifetime = true,
            // Sin margen de cortesía: la caducidad significa lo que dice.
            ClockSkew = TimeSpan.Zero
        };

        // La firma y la caducidad no bastan para decidir si la sesión sigue
        // abierta. Se compara la versión de credenciales del token contra la
        // actual en la base de datos — cambiar o restablecer la contraseña la
        // sube, y borrar la cuenta la hace desaparecer, así que un token anterior
        // deja de valer aquí, no en cada endpoint por separado.
        //
        // No se inyecta por constructor porque AddJwtBearer se configura antes
        // de que exista el contenedor de la petición: se resuelve desde
        // RequestServices, con alcance de petición.
        opciones.Events = new JwtBearerEvents
        {
            OnTokenValidated = async contexto =>
            {
                // El "sub" puede llegar remapeado a ClaimTypes.NameIdentifier según
                // la configuración de mapeo de claims entrantes: mismo fallback que
                // ya usa UsuarioAutenticado.TryObtenerId.
                var idText = contexto.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                    ?? contexto.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                var versionText = contexto.Principal?.FindFirstValue(ClaimsPropios.VersionDeCredenciales);

                // Sin alguno de los dos claims no hay con qué comparar: se trata
                // como sesión cerrada, no como válida por omisión.
                if (!Guid.TryParse(idText, out var usuarioId)
                    || !int.TryParse(versionText, out var version))
                {
                    contexto.Fail("El token no lleva versión de credenciales.");
                    return;
                }

                var repositorio = contexto.HttpContext.RequestServices
                    .GetRequiredService<IRepositorioDeUsuarios>();

                var versionActual = await repositorio.ObtenerVersionDeCredencialesAsync(
                    usuarioId, contexto.HttpContext.RequestAborted);

                // null: la cuenta ya no existe. Distinto de la versión: ambos
                // casos cierran la sesión igual.
                if (versionActual is null || versionActual != version)
                {
                    contexto.Fail("La sesión se ha cerrado.");
                }
            }
        };
    });

constructor.Services.AddAuthorization();

// La web se sirve desde otro origen, así que necesita CORS explícito.
// appsettings.json trae el dominio de producción; la web local va en
// appsettings.Development.json.
const string PoliticaDeLaWeb = "web";
var origenesPermitidos = (constructor.Configuration.GetSection("Cors:Origenes").Get<string[]>() ?? [])
    .Where(origen => !string.IsNullOrWhiteSpace(origen))
    .ToArray();

if (origenesPermitidos.Length == 0)
{
    // Solo en desarrollo hay un valor obvio. Fuera, una lista vacía es un
    // despliegue mal configurado: la web no podría llamar a la API, y es mejor
    // que no arranque a que falle en silencio en el navegador de cada usuario.
    origenesPermitidos = constructor.Environment.IsDevelopment()
        ? ["http://localhost:5321"]
        : throw new InvalidOperationException(
            "Falta 'Cors:Origenes': indica el origen de la web (p. ej. https://decorazon.angelgf.com.es).");
}

constructor.Services.AddCors(opciones =>
    opciones.AddPolicy(PoliticaDeLaWeb, politica => politica
        .WithOrigins(origenesPermitidos)
        .AllowAnyHeader()
        .AllowAnyMethod()
        // Sin esto el navegador esconde estas cabeceras a la web: no podría leer
        // el ETag para mandarlo luego en If-Match, ni el Location de lo creado.
        .WithExposedHeaders("ETag", "Location")));

// Detrás de nginx y del túnel de Cloudflare, la IP que ve Kestrel es la del
// proxy local. Sin esto, el limitador de peticiones metería a todos los usuarios
// en el mismo cubo y bastaría un visitante activo para bloquear el alta a los
// demás.
constructor.Services.Configure<ForwardedHeadersOptions>(opciones =>
{
    opciones.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    // Un único salto: nginx. Es él quien SOBRESCRIBE X-Forwarded-For con la
    // cabecera de Cloudflare, así que la lista nunca debe tener más de un valor.
    // Aceptar más permitiría a un cliente inyectar entradas falsas por la
    // izquierda y falsear su IP para saltarse el límite de peticiones.
    opciones.ForwardLimit = 1;

    // Solo se confía en el nginx local. Por defecto ASP.NET Core ya restringe a
    // loopback, pero se deja explícito para que quede constancia de la decisión.
    opciones.KnownProxies.Clear();
    opciones.KnownProxies.Add(IPAddress.Loopback);
    opciones.KnownProxies.Add(IPAddress.IPv6Loopback);
});

// Borra solicitudes terminadas hace más de 7 días y descarta los diseños de las
// altas caducadas. Los tests la apagan: correría antes de que la fixture migre
// la base.
if (constructor.Configuration.GetValue("Limpieza:Activa", true))
{
    constructor.Services.AddHostedService<TareaDeLimpieza>();
}

var aplicacion = constructor.Build();

// En desarrollo las migraciones se aplican solas; en producción, al desplegar.
if (aplicacion.Environment.IsDevelopment() && !soloDocumentoOpenApi)
{
    using var ambito = aplicacion.Services.CreateScope();
    await ambito.ServiceProvider.GetRequiredService<DecorazonDbContext>().Database.MigrateAsync();
}

// Lo primero de la cadena: todo lo que venga después (CORS, limitador,
// autenticación, logs) debe ver ya la IP y el esquema reales.
aplicacion.UseForwardedHeaders();

aplicacion.UseCors(PoliticaDeLaWeb);
aplicacion.UsarMensajeEnPeticionesNoValidas();
aplicacion.UseRateLimiter();
aplicacion.UseAuthentication();
aplicacion.UseAuthorization();

aplicacion.MapOpenApi();
aplicacion.MapSalud();
aplicacion.MapearEndpointsDeRegistro();
aplicacion.MapearEndpointsDeSesiones();
aplicacion.MapearEndpointsDeContrasenas();
aplicacion.MapearEndpointsDeCuentas();
aplicacion.MapearEndpointsDeDisenos();

aplicacion.Run();

/// <summary>Visible para <c>WebApplicationFactory</c> en los tests de integración.</summary>
public partial class Program;
