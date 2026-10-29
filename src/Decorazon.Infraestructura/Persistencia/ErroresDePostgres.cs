using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Decorazon.Infraestructura.Persistencia;

/// <summary>
/// Reconoce los rechazos de PostgreSQL que los adaptadores traducen a un resultado
/// del puerto. La aplicación nunca ve un tipo de EF ni de Npgsql.
/// </summary>
internal static class ErroresDePostgres
{
    /// <summary>23505: un índice único lo impide (p. ej. dos altas del mismo correo a la vez).</summary>
    public static bool EsUnicidadViolada(DbUpdateException excepcion) =>
        excepcion.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    /// <summary>23503: la fila de la que cuelga ya no existe (p. ej. la cuenta se está borrando).</summary>
    public static bool EsClaveForaneaViolada(DbUpdateException excepcion) =>
        excepcion.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation };
}
