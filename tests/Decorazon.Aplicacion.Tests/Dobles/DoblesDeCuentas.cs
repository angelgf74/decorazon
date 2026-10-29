using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Tests.Dobles;

/// <summary>Reloj controlable: la caducidad es una regla de negocio y hay que poder viajar en el tiempo.</summary>
public sealed class RelojFalso(DateTimeOffset inicio) : IReloj
{
    public DateTimeOffset Ahora { get; private set; } = inicio;

    public void Avanzar(TimeSpan cuanto) => Ahora = Ahora.Add(cuanto);
}

public sealed class RepositorioDeUsuariosEnMemoria : IRepositorioDeUsuarios
{
    private readonly List<Usuario> _usuarios = [];

    public IReadOnlyList<Usuario> Todos => _usuarios;

    public Task<Usuario?> BuscarPorCorreoAsync(CorreoElectronico correo, CancellationToken cancelacion = default) =>
        Task.FromResult(_usuarios.FirstOrDefault(usuario => usuario.Correo.Equals(correo)));

    public Task<Usuario?> BuscarPorIdAsync(Guid id, CancellationToken cancelacion = default) =>
        Task.FromResult(_usuarios.FirstOrDefault(usuario => usuario.Id == id));

    public Task<bool> ExisteConCorreoAsync(CorreoElectronico correo, CancellationToken cancelacion = default) =>
        Task.FromResult(_usuarios.Any(usuario => usuario.Correo.Equals(correo)));

    public Task<int?> ObtenerVersionDeCredencialesAsync(Guid id, CancellationToken cancelacion = default) =>
        Task.FromResult((int?)_usuarios.FirstOrDefault(usuario => usuario.Id == id)?.VersionDeCredenciales);

    /// <summary>
    /// Si está a <c>true</c>, el próximo guardado simula que otro se adelantó (otra alta
    /// del mismo correo, el enlace ya usado, la cuenta borrada): devuelve <c>false</c> y no guarda.
    /// </summary>
    public bool OtroSeAdelanta { get; set; }

    public Task<bool> AnadirAsync(Usuario usuario, CancellationToken cancelacion = default)
    {
        if (Adelantado())
        {
            return Task.FromResult(false);
        }

        _usuarios.Add(usuario);
        return Task.FromResult(true);
    }

    /// <summary>Los objetos son los mismos que guarda la lista: mutarlos ya los "persiste".</summary>
    public Task<bool> ActualizarAsync(Usuario usuario, CancellationToken cancelacion = default) =>
        Task.FromResult(!Adelantado());

    private bool Adelantado()
    {
        var adelantado = OtroSeAdelanta;
        OtroSeAdelanta = false;
        return adelantado;
    }

    /// <summary>Simula que la cuenta desaparece entre dos pasos de un flujo.</summary>
    public void Quitar(Usuario usuario) => _usuarios.Remove(usuario);
}

public sealed class RepositorioDeSolicitudesDeContrasenaEnMemoria : IRepositorioDeSolicitudesDeContrasena
{
    private readonly List<SolicitudDeContrasena> _solicitudes = [];

    public IReadOnlyList<SolicitudDeContrasena> Todas => _solicitudes;

    public Task<SolicitudDeContrasena?> BuscarPorHashDelTokenAsync(
        string hashDelToken,
        CancellationToken cancelacion = default) =>
        Task.FromResult(_solicitudes.FirstOrDefault(solicitud => solicitud.HashDelToken == hashDelToken));

    public Task<IReadOnlyCollection<SolicitudDeContrasena>> BuscarVivasPorUsuarioAsync(
        Guid usuarioId,
        CancellationToken cancelacion = default) =>
        Task.FromResult<IReadOnlyCollection<SolicitudDeContrasena>>(
            _solicitudes.Where(solicitud => solicitud.UsuarioId == usuarioId && !solicitud.EstaConsumida).ToList());

    public Task AnadirAsync(SolicitudDeContrasena solicitud, CancellationToken cancelacion = default)
    {
        _solicitudes.Add(solicitud);
        return Task.CompletedTask;
    }

    public Task<bool> GuardarCambiosAsync(CancellationToken cancelacion = default) => Task.FromResult(true);
}

public sealed class RepositorioDeSolicitudesEnMemoria : IRepositorioDeSolicitudesDeRegistro
{
    private readonly List<SolicitudDeRegistro> _solicitudes = [];

    /// <summary>Cuántas veces se ha pedido guardar: permite afirmar que un cambio llegó a persistirse.</summary>
    public int GuardadosSolicitados { get; private set; }

    public IReadOnlyList<SolicitudDeRegistro> Todas => _solicitudes;

    public Task<SolicitudDeRegistro?> BuscarPorHashDelTokenAsync(
        string hashDelToken,
        CancellationToken cancelacion = default) =>
        Task.FromResult(_solicitudes.FirstOrDefault(solicitud => solicitud.HashDelToken == hashDelToken));

    public Task<IReadOnlyCollection<SolicitudDeRegistro>> BuscarVivasPorCorreoAsync(
        CorreoElectronico correo,
        CancellationToken cancelacion = default) =>
        Task.FromResult<IReadOnlyCollection<SolicitudDeRegistro>>(
            _solicitudes.Where(solicitud => solicitud.Correo.Equals(correo) && !solicitud.EstaConsumida).ToList());

    public Task<int> ContarCreadasDesdeAsync(
        CorreoElectronico correo,
        DateTimeOffset desde,
        CancellationToken cancelacion = default) =>
        Task.FromResult(_solicitudes.Count(solicitud =>
            solicitud.Correo.Equals(correo) && solicitud.FechaDeCreacion >= desde));

    public Task AnadirAsync(SolicitudDeRegistro solicitud, CancellationToken cancelacion = default)
    {
        _solicitudes.Add(solicitud);
        return Task.CompletedTask;
    }

    public Task<bool> GuardarCambiosAsync(CancellationToken cancelacion = default)
    {
        GuardadosSolicitados++;
        return Task.FromResult(true);
    }
}

/// <summary>Registra los envíos en lugar de hacerlos, para poder afirmar sobre ellos.</summary>
public sealed class EnviadorDeCorreoEspia : IEnviadorDeCorreo
{
    public List<(string Destinatario, string Enlace)> EnlacesDeAlta { get; } = [];

    public List<(string Destinatario, string Enlace)> EnlacesDeContrasena { get; } = [];

    public List<string> AvisosDeCuentaExistente { get; } = [];

    public List<string> ConfirmacionesDeCambioDeContrasena { get; } = [];

    public List<string> ConfirmacionesDeBaja { get; } = [];

    /// <summary>
    /// Si está a <c>true</c>, el aviso de cambio de contraseña revienta. Sirve
    /// para comprobar que el cambio sobrevive a que el correo falle.
    /// </summary>
    public bool FallaAlEnviar { get; set; }

    /// <summary>Si está a <c>true</c>, el correo de la baja revienta: la baja debe sobrevivir.</summary>
    public bool FallaAlAvisarDeLaBaja { get; set; }

    public Task EnviarEnlaceDeAltaAsync(
        CorreoElectronico destinatario,
        string enlace,
        CancellationToken cancelacion = default)
    {
        EnlacesDeAlta.Add((destinatario.Valor, enlace));
        return Task.CompletedTask;
    }

    public Task EnviarAvisoDeCuentaExistenteAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default)
    {
        AvisosDeCuentaExistente.Add(destinatario.Valor);
        return Task.CompletedTask;
    }

    public Task EnviarEnlaceDeContrasenaAsync(
        CorreoElectronico destinatario,
        string enlace,
        CancellationToken cancelacion = default)
    {
        EnlacesDeContrasena.Add((destinatario.Valor, enlace));
        return Task.CompletedTask;
    }

    public Task EnviarConfirmacionDeCambioDeContrasenaAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default)
    {
        if (FallaAlEnviar)
        {
            throw new InvalidOperationException("Fallo simulado del envío de correo.");
        }

        ConfirmacionesDeCambioDeContrasena.Add(destinatario.Valor);
        return Task.CompletedTask;
    }

    public Task EnviarConfirmacionDeBajaAsync(
        CorreoElectronico destinatario,
        CancellationToken cancelacion = default)
    {
        if (FallaAlAvisarDeLaBaja)
        {
            throw new InvalidOperationException("Fallo simulado del envío de correo.");
        }

        ConfirmacionesDeBaja.Add(destinatario.Valor);
        return Task.CompletedTask;
    }
}

/// <summary>Tokens predecibles: los tests necesitan saber cuál se generó.</summary>
public sealed class GeneradorDeTokensPredecible : IGeneradorDeTokens
{
    private int _siguiente;

    public string UltimoTokenGenerado { get; private set; } = string.Empty;

    public string GenerarToken()
    {
        UltimoTokenGenerado = $"token-{++_siguiente}";
        return UltimoTokenGenerado;
    }

    public string Hashear(string token) => $"hash({token})";
}

/// <summary>Hasheador trivial: los tests de aplicación no prueban criptografía.</summary>
public sealed class HasheadorFalso : IHasheadorDeContrasenas
{
    public string HashSenuelo => "hash(senuelo)";

    public string Hashear(Contrasena contrasena) => $"hash({contrasena.Valor})";

    public bool Verificar(string contrasenaEnClaro, string hashAlmacenado) =>
        hashAlmacenado == $"hash({contrasenaEnClaro})";
}

public sealed class EmisorDeAccesoFalso : IEmisorDeAcceso
{
    public AccesoEmitido Emitir(Usuario usuario) =>
        new($"acceso-de-{usuario.Correo.Valor}", DateTimeOffset.UtcNow.AddDays(1));
}

public sealed class BorradoEspia : IBorradoDeCuentas
{
    public List<(Guid UsuarioId, string Correo)> Borradas { get; } = [];

    public Task BorrarAsync(Guid usuarioId, CorreoElectronico correo, CancellationToken cancelacion = default)
    {
        Borradas.Add((usuarioId, correo.Valor));
        return Task.CompletedTask;
    }
}

public sealed class LimpiezaEspia : ILimpiezaDeCaducados
{
    public DateTimeOffset? Limite { get; private set; }

    public DateTimeOffset? AhoraDeDescarte { get; private set; }

    public int DisenosPorDescartar { get; set; }

    public Task<ResultadoDeLimpieza> BorrarTerminadasAntesDeAsync(DateTimeOffset limite, CancellationToken cancelacion = default)
    {
        Limite = limite;
        return Task.FromResult(new ResultadoDeLimpieza(0, 0));
    }

    public Task<int> DescartarDisenosCaducadosAsync(DateTimeOffset ahora, CancellationToken cancelacion = default)
    {
        AhoraDeDescarte = ahora;
        return Task.FromResult(DisenosPorDescartar);
    }
}
