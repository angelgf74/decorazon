using Decorazon.Dominio.Usuarios;

namespace Decorazon.Dominio.Puertos;

public interface IHasheadorDeContrasenas
{
    string Hashear(Contrasena contrasena);

    /// <summary>Comprobación en tiempo constante: no debe delatar en qué byte falla.</summary>
    bool Verificar(string contrasenaEnClaro, string hashAlmacenado);

    /// <summary>
    /// Hash de referencia contra el que verificar cuando el usuario no existe.
    /// Iguala el coste del camino "correo desconocido" con el de "contraseña incorrecta",
    /// de forma que el tiempo de respuesta no revele qué correos tienen cuenta.
    /// </summary>
    string HashSenuelo { get; }
}
