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
    /// <summary>Sin contenido: el listado no lo necesita y puede pesar mucho.</summary>
    public Task<IReadOnlyList<ResumenDeDiseno>> ListarAsync(Guid usuarioId, CancellationToken cancelacion = default) =>
        disenos.ListarResumenesAsync(usuarioId, cancelacion);

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

        // Solo falla si la cuenta se ha borrado entretanto: para quien llama, ya no hay dónde crearlo.
        if (!await disenos.GuardarCambiosAsync(cancelacion))
        {
            return new ResultadoDeDiseno(EstadoDeDiseno.NoEncontrado);
        }

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
