namespace Decorazon.Dominio.Puertos;

/// <summary>
/// Ya hay guardado un diseño con ese id, de este usuario o de otro. Es parte del
/// contrato de <see cref="IRepositorioDeDisenos.GuardarCambiosAsync"/>: el alta con
/// el id del cliente la captura para releer y decidir si es un reintento o un choque.
/// </summary>
public sealed class IdentificadorRepetidoException(Exception? causa = null)
    : Exception("Ya existe un diseño con ese identificador.", causa);
