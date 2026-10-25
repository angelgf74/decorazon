using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Registro;

/// <summary>
/// Paso 2 del alta: el usuario abre el enlace, dice su nombre y elige contraseña.
/// Es el único camino por el que nace un <see cref="Usuario"/>. Si la solicitud
/// traía un diseño, la cuenta nace ya con él.
/// </summary>
public sealed class CompletarRegistro(
    IRepositorioDeUsuarios usuarios,
    IRepositorioDeDisenos disenos,
    IRepositorioDeSolicitudesDeRegistro solicitudes,
    IGeneradorDeTokens generadorDeTokens,
    IHasheadorDeContrasenas hasheador,
    IReloj reloj)
{
    public async Task<ResultadoDeCompletarRegistro> EjecutarAsync(
        string token,
        string nombreIndicado,
        string contrasenaIndicada,
        CancellationToken cancelacion = default)
    {
        // Los datos se validan antes de tocar el token: al revés, un error de
        // tecleo quemaría el enlace y obligaría a pedir otro.
        if (!NombreDeUsuario.TryCrear(nombreIndicado, out var nombre))
        {
            return ResultadoDeCompletarRegistro.NombreNoValido;
        }

        if (!Contrasena.TryCrear(contrasenaIndicada, out var contrasena))
        {
            return ResultadoDeCompletarRegistro.ContrasenaNoValida;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return ResultadoDeCompletarRegistro.EnlaceNoValido;
        }

        var solicitud = await solicitudes.BuscarPorHashDelTokenAsync(
            generadorDeTokens.Hashear(token), cancelacion);

        // Inexistente, manipulado, caducado o ya usado comparten respuesta: un mensaje
        // distinto para cada caso permitiría sondear qué tokens existieron.
        if (solicitud is null || !solicitud.Consumir(reloj.Ahora))
        {
            return ResultadoDeCompletarRegistro.EnlaceNoValido;
        }

        // Carrera posible: dos solicitudes vivas para el mismo correo completadas a la vez.
        // La comprobación cubre el caso normal; el índice único de la base de datos
        // es la red de seguridad ante la simultaneidad real.
        if (await usuarios.ExisteConCorreoAsync(solicitud.Correo, cancelacion))
        {
            // Se persiste el consumo igualmente: el token ya se ha gastado y no
            // debe poder reintentarse.
            solicitud.DescartarDiseno();
            await solicitudes.GuardarCambiosAsync(cancelacion);
            return ResultadoDeCompletarRegistro.EnlaceNoValido;
        }

        var usuario = Usuario.Crear(solicitud.Correo, nombre, hasheador.Hashear(contrasena), reloj.Ahora);

        // El diseño pendiente pasa a ser del usuario nuevo. Anadir solo lo rastrea, igual
        // que DescartarDiseno: nada se persiste hasta usuarios.AnadirAsync, que en producción
        // guarda el DbContext compartido por todos los repositorios, como en jornal. Ese único
        // guardado confirma a la vez usuario, diseño, consumo del token y solicitud sin diseño,
        // y no puede quedar ninguno a medias. solicitudes.GuardarCambiosAsync va después y es la
        // red de seguridad si algún adaptador no comparte contexto.
        if (solicitud.Diseno is { } pendiente)
        {
            disenos.Anadir(
                Diseno.Crear(usuario.Id, pendiente.Nombre, pendiente.Tipo, pendiente.Contenido, reloj.Ahora));
            solicitud.DescartarDiseno();
        }

        await usuarios.AnadirAsync(usuario, cancelacion);
        await solicitudes.GuardarCambiosAsync(cancelacion);

        return ResultadoDeCompletarRegistro.Completado;
    }
}

public enum ResultadoDeCompletarRegistro
{
    Completado,

    /// <summary>Token inexistente, manipulado, caducado o ya consumido.</summary>
    EnlaceNoValido,

    NombreNoValido,

    ContrasenaNoValida
}
