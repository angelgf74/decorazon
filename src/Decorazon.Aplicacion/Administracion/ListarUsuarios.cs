using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Administracion;

/// <summary>
/// La lista de cuentas para la vista de administración: de la que más ocupa a
/// la que menos, con los totales. Quién puede pedirla lo decide la API.
/// </summary>
public sealed class ListarUsuarios(IConsultaDeUsuarios consulta)
{
    public async Task<ListadoDeUsuarios> EjecutarAsync(CancellationToken cancelacion = default)
    {
        var usuarios = await consulta.UsoPorUsuarioAsync(cancelacion);

        var ordenados = usuarios
            .OrderByDescending(u => u.Bytes)
            .ThenByDescending(u => u.Disenos)
            .ThenBy(u => u.FechaDeAlta)
            .ToList();

        return new ListadoDeUsuarios(
            ordenados,
            ordenados.Sum(u => u.Disenos),
            ordenados.Sum(u => u.Bytes));
    }
}

public sealed record ListadoDeUsuarios(IReadOnlyList<UsoDeUsuario> Usuarios, int TotalDeDisenos, long TotalDeBytes);
