using Decorazon.Aplicacion.Contrasenas;
using Decorazon.Aplicacion.Cuentas;
using Decorazon.Aplicacion.Disenos;
using Decorazon.Aplicacion.Limpieza;
using Decorazon.Aplicacion.Registro;
using Decorazon.Aplicacion.Salud;
using Decorazon.Aplicacion.Sesiones;
using Microsoft.Extensions.DependencyInjection;

namespace Decorazon.Aplicacion;

public static class InyeccionDeDependencias
{
    public static IServiceCollection AddAplicacion(this IServiceCollection servicios)
    {
        servicios.AddScoped<ConsultarSalud>();
        servicios.AddScoped<SolicitarRegistro>();
        servicios.AddScoped<CompletarRegistro>();
        servicios.AddScoped<IniciarSesion>();
        servicios.AddScoped<ConsultarMiCuenta>();
        servicios.AddScoped<SolicitarRestablecerContrasena>();
        servicios.AddScoped<RestablecerContrasena>();
        servicios.AddScoped<CambiarContrasena>();
        servicios.AddScoped<BorrarCuenta>();
        servicios.AddScoped<GestionDeDisenos>();
        servicios.AddScoped<LimpiarCaducados>();

        return servicios;
    }
}
