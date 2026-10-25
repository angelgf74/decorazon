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
    VersionDistinta
}

/// <summary>
/// <see cref="Diseno"/> va con <see cref="EstadoDeDiseno.Correcto"/> y con
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
    public Task<IReadOnlyList<Diseno>> ListarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        disenos.ListarAsync(usuarioId, cancelacion);

    public Task<Diseno?> ObtenerAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default) =>
        disenos.ObtenerAsync(usuarioId, id, cancelacion);

    public async Task<ResultadoDeDiseno> CrearAsync(
        Guid usuarioId, PeticionDeDiseno peticion, CancellationToken cancelacion = default)
    {
        var conversion = peticion.Convertir();
        if (!conversion.EsValida)
        {
            return Rechazo(conversion);
        }

        if (await disenos.ContarAsync(usuarioId, cancelacion) >= Diseno.MaximoPorUsuario)
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.LimiteAlcanzado);
        }

        var diseno = Diseno.Crear(usuarioId, conversion.Nombre!, conversion.Tipo, conversion.Contenido!, reloj.Ahora);
        disenos.Anadir(diseno);
        await disenos.GuardarCambiosAsync(cancelacion);

        return new ResultadoDeDiseno(EstadoDeDiseno.Correcto, diseno);
    }

    public async Task<ResultadoDeDiseno> ActualizarAsync(
        Guid usuarioId, Guid id, int versionEsperada, PeticionDeDiseno peticion, CancellationToken cancelacion = default)
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

        diseno.Actualizar(conversion.Nombre!, conversion.Tipo, conversion.Contenido!, reloj.Ahora);
        await disenos.GuardarCambiosAsync(cancelacion);

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
        await disenos.GuardarCambiosAsync(cancelacion);

        return new ResultadoDeDiseno(EstadoDeDiseno.Correcto, copia);
    }

    /// <returns>False si no existe o es de otro usuario.</returns>
    public async Task<bool> BorrarAsync(Guid usuarioId, Guid id, CancellationToken cancelacion = default)
    {
        var diseno = await disenos.ObtenerAsync(usuarioId, id, cancelacion);
        if (diseno is null)
        {
            return false;
        }

        disenos.Borrar(diseno);
        await disenos.GuardarCambiosAsync(cancelacion);

        return true;
    }

    private static ResultadoDeDiseno Rechazo(ConversionDeDiseno conversion) => conversion.Motivo switch
    {
        MotivoDeRechazoDeDiseno.NombreNoValido => new ResultadoDeDiseno(EstadoDeDiseno.NombreNoValido),
        MotivoDeRechazoDeDiseno.TipoNoValido => new ResultadoDeDiseno(EstadoDeDiseno.TipoNoValido),
        _ => new ResultadoDeDiseno(EstadoDeDiseno.ContenidoNoValido, Contenido: conversion.DetalleDelContenido)
    };
}
