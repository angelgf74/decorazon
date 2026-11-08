using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;

namespace Decorazon.Infraestructura.Persistencia;

/// <summary>
/// Adaptador de <see cref="IConsultaDeUsuarios"/> contra PostgreSQL: una sola
/// consulta agregada que mide con <c>pg_column_size</c> lo que ocupa cada fila
/// tal como está almacenada, sin traer a memoria ni contenidos ni imágenes.
/// </summary>
/// <remarks>
/// SQL literal y no LINQ: <c>pg_column_size</c> no tiene traducción en EF y una
/// función mapeada sobre una propiedad con conversión (el contenido es un
/// objeto de valor) es frágil. No lleva parámetros, así que no hay nada que
/// inyectar. Las columnas van en snake_case: la convención del contexto también
/// se aplica al tipo de <see cref="Fila"/>, así que <c>fecha_de_alta</c> es <c>FechaDeAlta</c>.
/// </remarks>
public sealed class ConsultaDeUsuariosEf(DecorazonDbContext contexto) : IConsultaDeUsuarios
{
    public async Task<IReadOnlyList<UsoDeUsuario>> UsoPorUsuarioAsync(CancellationToken cancelacion = default)
    {
        var filas = await contexto.Database
            .SqlQuery<Fila>($"""
                SELECT
                    u.id,
                    u.correo,
                    u.nombre,
                    u.fecha_de_alta,
                    (SELECT count(*) FROM disenos d WHERE d.usuario_id = u.id) AS disenos,
                    COALESCE((SELECT sum(pg_column_size(d.contenido)) FROM disenos d WHERE d.usuario_id = u.id), 0)
                    + COALESCE((SELECT sum(pg_column_size(v.imagen))
                                FROM vistas_previas v JOIN disenos d ON d.id = v.diseno_id
                                WHERE d.usuario_id = u.id), 0)
                    + COALESCE((SELECT sum(pg_column_size(a.contenido))
                                FROM versiones_anteriores a JOIN disenos d ON d.id = a.diseno_id
                                WHERE d.usuario_id = u.id), 0) AS bytes
                FROM usuarios u
                """)
            .ToListAsync(cancelacion);

        return filas
            .Select(f => new UsoDeUsuario(f.Id, f.Correo, f.Nombre, f.FechaDeAlta, (int)f.Disenos, f.Bytes))
            .ToList();
    }

    /// <summary><c>count</c> y <c>sum</c> de enteros salen de PostgreSQL como <c>bigint</c> y <c>numeric</c>.</summary>
    private sealed class Fila
    {
        public Guid Id { get; set; }
        public string Correo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public DateTimeOffset FechaDeAlta { get; set; }
        public long Disenos { get; set; }
        public long Bytes { get; set; }
    }
}
