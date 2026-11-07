using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Puertos;

namespace Decorazon.Aplicacion.Disenos;

public enum EstadoDeDiseno
{
    Correcto,
    NoEncontrado,
    NombreNoValido,
    TipoNoValido,
    ContenidoNoValido,
    LimiteAlcanzado,
    VersionDistinta,

    /// <summary>El alta con ese id ya se hizo: es un reintento y va con el diseño guardado.</summary>
    YaCreado,

    /// <summary>El id del alta ya lo usa un diseño de otro usuario.</summary>
    IdentificadorEnUso,

    IdentificadorNoValido
}

/// <summary>
/// <see cref="Diseno"/> va con <see cref="EstadoDeDiseno.Correcto"/>, con
/// <see cref="EstadoDeDiseno.YaCreado"/> (el guardado) y con
/// <see cref="EstadoDeDiseno.VersionDistinta"/> (el actual, para que el cliente reconcilie);
/// <see cref="Contenido"/> solo con <see cref="EstadoDeDiseno.ContenidoNoValido"/>.
/// </summary>
public sealed record ResultadoDeDiseno(
    EstadoDeDiseno Estado,
    Diseno? Diseno = null,
    ResultadoDeContenido? Contenido = null);

/// <summary>
/// Casos de uso de los diseños de un usuario. Un diseño ajeno es indistinguible
/// de uno inexistente (<see cref="EstadoDeDiseno.NoEncontrado"/>).
/// </summary>
public sealed class GestionDeDisenos(IRepositorioDeDisenos disenos, IReloj reloj)
{
    /// <summary>Sin contenido: el listado no lo necesita y puede pesar mucho.</summary>
    public Task<IReadOnlyList<ResumenDeDiseno>> ListarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        disenos.ListarResumenesAsync(usuarioId, cancelacion);

    public Task<Diseno?> ObtenerAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        disenos.ObtenerAsync(usuarioId, id, cancelacion);

    /// <summary>
    /// Con <see cref="PeticionDeDiseno.Id"/> el alta es idempotente: si ese diseño ya es
    /// del usuario, devuelve <see cref="EstadoDeDiseno.YaCreado"/> sin tocarlo, aunque el
    /// cuerpo sea distinto. Así el cliente puede reintentar un alta cuya respuesta perdió.
    /// </summary>
    public async Task<ResultadoDeDiseno> CrearAsync(
        Guid usuarioId, PeticionDeDiseno peticion, CancellationToken cancelacion = default)
    {
        if (peticion.Id == Guid.Empty)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.IdentificadorNoValido);
        }

        var conversion = peticion.Convertir();
        if (!conversion.EsValida)
        {
            return Rechazo(conversion);
        }

        // Antes que el límite: el reintento de un alta que ya se guardó ya cuenta entre los cien.
        if (peticion.Id is { } id && await disenos.ObtenerAsync(usuarioId, id, cancelacion) is { } existente)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.YaCreado, existente);
        }

        if (await disenos.ContarAsync(usuarioId, cancelacion) >= Diseno.MaximoPorUsuario)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.LimiteAlcanzado);
        }

        var diseno = peticion.Id is { } propuesto
            ? Diseno.Crear(propuesto, usuarioId, conversion.Nombre!, conversion.Tipo, conversion.Contenido!, reloj.Ahora)
            : Diseno.Crear(usuarioId, conversion.Nombre!, conversion.Tipo, conversion.Contenido!, reloj.Ahora);
        disenos.Anadir(diseno);

        try
        {
            // Solo falla si la cuenta se ha borrado entretanto: para quien llama, ya no hay dónde crearlo.
            if (!await disenos.GuardarCambiosAsync(cancelacion))
            {
                return new ResultadoDeDiseno(EstadoDeDiseno.NoEncontrado);
            }
        }
        catch (IdentificadorRepetidoException)
        {
            // El id ya estaba guardado: o lo es de otro usuario (el repositorio no deja verlo),
            // o un alta simultánea del mismo usuario se adelantó. Se relee para distinguirlos.
            var actual = await disenos.ObtenerAsync(usuarioId, diseno.Id, cancelacion);
            return actual is null
                ? new ResultadoDeDiseno(EstadoDeDiseno.IdentificadorEnUso)
                : new ResultadoDeDiseno(EstadoDeDiseno.YaCreado, actual);
        }

        return new ResultadoDeDiseno(EstadoDeDiseno.Correcto, diseno);
    }

    public async Task<ResultadoDeDiseno> ActualizarAsync(
        Guid usuarioId, Guid id, int versionEsperada, PeticionDeDiseno peticion, CancellationToken cancelacion = default) =>
        await ActualizarAsync(usuarioId, id, versionEsperada, peticion, copiaPedida: false, cancelacion);

    /// <summary>
    /// Como el otro, y antes de cambiarlo copia el diseño (M-21) si lo pide quien guarda (<paramref name="copiaPedida"/>:
    /// la web al sobrescribir tras un conflicto) o si el último guardado tiene al menos <see cref="VersionAnterior.PausaParaCopiar"/>.
    /// La copia y el diseño se guardan juntos.
    /// </summary>
    public async Task<ResultadoDeDiseno> ActualizarAsync(
        Guid usuarioId, Guid id, int versionEsperada, PeticionDeDiseno peticion, bool copiaPedida, CancellationToken cancelacion = default)
    {
        var diseno = await disenos.ObtenerAsync(usuarioId, id, cancelacion);
        if (diseno is null)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.NoEncontrado);
        }

        var conversion = peticion.Convertir();
        if (!conversion.EsValida)
        {
            return Rechazo(conversion);
        }

        if (diseno.Version != versionEsperada)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.VersionDistinta, diseno);
        }

        if (VersionAnterior.TocaCopiar(diseno, reloj.Ahora, copiaPedida))
        {
            await disenos.CopiarVersionAnteriorAsync(diseno, cancelacion);
        }

        diseno.Actualizar(conversion.Nombre!, conversion.Tipo, conversion.Contenido!, reloj.Ahora);

        if (!await disenos.GuardarCambiosAsync(cancelacion))
        {
            // Otro guardado o borrado se coló entre la lectura y la escritura. Se relee para
            // responder igual que si hubiera llegado antes: 412 con el actual, o 404.
            var actual = await disenos.ObtenerAsync(usuarioId, id, cancelacion);
            return actual is null
                ? new ResultadoDeDiseno(EstadoDeDiseno.NoEncontrado)
                : new ResultadoDeDiseno(EstadoDeDiseno.VersionDistinta, actual);
        }

        return new ResultadoDeDiseno(EstadoDeDiseno.Correcto, diseno);
    }

    /// <summary>La copia de antes de sobrescribir (M-21); null si el diseño no es suyo o no tiene.</summary>
    public Task<VersionAnterior?> ObtenerVersionAnteriorAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        disenos.ObtenerVersionAnteriorAsync(usuarioId, id, cancelacion);

    /// <summary>
    /// Vuelve a la copia: el diseño toma su nombre, tipo y contenido (versión nueva), y lo que había pasa a ser la copia,
    /// así que recuperar se deshace recuperando otra vez. NoEncontrado si no hay diseño o copia; VersionDistinta si el
    /// diseño cambió desde <paramref name="versionEsperada"/>.
    /// </summary>
    public async Task<ResultadoDeDiseno> RecuperarVersionAnteriorAsync(
        Guid usuarioId, Guid id, int versionEsperada, CancellationToken cancelacion = default)
    {
        var diseno = await disenos.ObtenerAsync(usuarioId, id, cancelacion);
        var copia = diseno is null ? null : await disenos.ObtenerVersionAnteriorAsync(usuarioId, id, cancelacion);
        if (diseno is null || copia is null)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.NoEncontrado);
        }

        if (diseno.Version != versionEsperada)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.VersionDistinta, diseno);
        }

        await disenos.CopiarVersionAnteriorAsync(diseno, cancelacion);
        diseno.Actualizar(copia.Nombre, copia.Tipo, copia.Contenido, reloj.Ahora);

        if (!await disenos.GuardarCambiosAsync(cancelacion))
        {
            var actual = await disenos.ObtenerAsync(usuarioId, id, cancelacion);
            return actual is null
                ? new ResultadoDeDiseno(EstadoDeDiseno.NoEncontrado)
                : new ResultadoDeDiseno(EstadoDeDiseno.VersionDistinta, actual);
        }

        return new ResultadoDeDiseno(EstadoDeDiseno.Correcto, diseno);
    }

    public async Task<ResultadoDeDiseno> DuplicarAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default)
    {
        var original = await disenos.ObtenerAsync(usuarioId, id, cancelacion);
        if (original is null)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.NoEncontrado);
        }

        if (await disenos.ContarAsync(usuarioId, cancelacion) >= Diseno.MaximoPorUsuario)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.LimiteAlcanzado);
        }

        var copia = original.Duplicar(reloj.Ahora);
        disenos.Anadir(copia);

        if (!await disenos.GuardarCambiosAsync(cancelacion))
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.NoEncontrado);
        }

        return new ResultadoDeDiseno(EstadoDeDiseno.Correcto, copia);
    }

    /// <returns>
    /// False si no existe o es de otro usuario, o si otro lo borró o cambió mientras
    /// tanto: en ese caso no se borra lo que el usuario no ha visto.
    /// </returns>
    public async Task<bool> BorrarAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default)
    {
        var diseno = await disenos.ObtenerAsync(usuarioId, id, cancelacion);
        if (diseno is null)
        {
            return false;
        }

        disenos.Borrar(diseno);

        return await disenos.GuardarCambiosAsync(cancelacion);
    }

    private static ResultadoDeDiseno Rechazo(ConversionDeDiseno conversion) => conversion.Motivo switch
    {
        MotivoDeRechazoDeDiseno.NombreNoValido => new ResultadoDeDiseno(EstadoDeDiseno.NombreNoValido),
        MotivoDeRechazoDeDiseno.TipoNoValido => new ResultadoDeDiseno(EstadoDeDiseno.TipoNoValido),
        _ => new ResultadoDeDiseno(EstadoDeDiseno.ContenidoNoValido, Contenido: conversion.DetalleDelContenido)
    };
}
