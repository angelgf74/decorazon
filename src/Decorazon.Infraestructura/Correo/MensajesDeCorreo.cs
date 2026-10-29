using System.Net;

namespace Decorazon.Infraestructura.Correo;

/// <summary>
/// Textos de los correos, en un solo sitio para que los dos enviadores
/// (Brevo y consola) manden exactamente lo mismo.
/// </summary>
/// <remarks>
/// Cada mensaje tiene versión HTML <b>y</b> texto plano. No es un adorno para
/// clientes antiguos: un correo solo-HTML es una de las señales de spam más
/// habituales, porque el correo legítimo casi siempre incluye ambas partes.
/// Los filtros además comparan las dos versiones, y que digan lo mismo suma.
/// Los enlaces los construye quien llama: aquí no hay ningún host fijo.
/// </remarks>
internal static class MensajesDeCorreo
{
    // Los enlaces los construye quien llama, pero van a un atributo y a un texto HTML:
    // se codifican por si algún día llevan &, comillas o corchetes.
    private static string Html(string enlace) => WebUtility.HtmlEncode(enlace);

    public const string AsuntoDeAlta = "Completa tu alta en Decorazon";

    public const string AsuntoDeCuentaExistente = "Alguien ha pedido crear una cuenta con tu correo";

    public static string CuerpoDeAlta(string enlace) =>
        $"""
         <p>Hola:</p>
         <p>Para terminar de crear tu cuenta en Decorazon, elige tu contraseña aquí:</p>
         <p><a href="{Html(enlace)}">Elegir mi contraseña</a></p>
         <p>Si el botón no funciona, copia esta dirección en tu navegador:<br>
         <span>{Html(enlace)}</span></p>
         <p>El enlace caduca en 24 horas y solo se puede usar una vez.</p>
         <p>Si no has pedido tú esta alta, ignora este mensaje: sin abrir el enlace no se crea ninguna cuenta.</p>
         """;

    public static string TextoDeAlta(string enlace) =>
        $"""
         Hola:

         Para terminar de crear tu cuenta en Decorazon, elige tu contraseña en esta dirección:

         {enlace}

         El enlace caduca en 24 horas y solo se puede usar una vez.

         Si no has pedido tú esta alta, ignora este mensaje: sin abrir el enlace no se
         crea ninguna cuenta.
         """;

    public const string AsuntoDeContrasena = "Recupera tu contraseña de Decorazon";

    public static string CuerpoDeContrasena(string enlace) =>
        $"""
         <p>Hola:</p>
         <p>Has pedido volver a entrar en Decorazon. Elige aquí tu contraseña nueva:</p>
         <p><a href="{Html(enlace)}">Elegir contraseña nueva</a></p>
         <p>Si el botón no funciona, copia esta dirección en tu navegador:<br>
         <span>{Html(enlace)}</span></p>
         <p>El enlace caduca en una hora y solo se puede usar una vez.</p>
         <p>Si no lo has pedido tú, ignora este mensaje: tu contraseña actual sigue funcionando y no hemos cambiado nada.</p>
         """;

    public static string TextoDeContrasena(string enlace) =>
        $"""
         Hola:

         Has pedido volver a entrar en Decorazon. Elige tu contraseña nueva en esta dirección:

         {enlace}

         El enlace caduca en una hora y solo se puede usar una vez.

         Si no lo has pedido tú, ignora este mensaje: tu contraseña actual sigue
         funcionando y no hemos cambiado nada.
         """;

    public static string CuerpoDeCuentaExistente() =>
        """
        <p>Hola:</p>
        <p>Alguien ha intentado crear una cuenta en Decorazon con esta dirección, que ya tiene una.</p>
        <p>No hemos hecho ningún cambio. Si has sido tú, inicia sesión con tu contraseña habitual.</p>
        <p>Si no reconoces el intento, puedes ignorar este mensaje.</p>
        """;

    public static string TextoDeCuentaExistente() =>
        """
        Hola:

        Alguien ha intentado crear una cuenta en Decorazon con esta dirección, que ya tiene una.

        No hemos hecho ningún cambio. Si has sido tú, inicia sesión con tu contraseña habitual.

        Si no reconoces el intento, puedes ignorar este mensaje.
        """;

    public const string AsuntoDeCambioDeContrasena = "Tu contraseña de Decorazon ha cambiado";

    public static string CuerpoDeCambioDeContrasena() =>
        """
        <p>Hola:</p>
        <p>La contraseña de tu cuenta de Decorazon se ha cambiado.</p>
        <p>Si has sido tú, no tienes que hacer nada más.</p>
        <p><strong>Si no has sido tú</strong>, respóndenos a este mensaje: hacía falta la contraseña anterior para cambiarla, así que conviene que la cambies también en cualquier otro sitio donde usaras esa misma.</p>
        """;

    public static string TextoDeCambioDeContrasena() =>
        """
        Hola:

        La contraseña de tu cuenta de Decorazon se ha cambiado.

        Si has sido tú, no tienes que hacer nada más.

        Si no has sido tú, respóndenos a este mensaje: hacía falta la contraseña
        anterior para cambiarla, así que conviene que la cambies también en
        cualquier otro sitio donde usaras esa misma.
        """;

    public const string AsuntoDeBaja = "Tu cuenta de Decorazon se ha borrado";

    public static string CuerpoDeBaja() =>
        """
        <p>Hola:</p>
        <p>Tu cuenta de Decorazon se ha borrado, con todos los diseños que tenía guardados.</p>
        <p>De las copias de seguridad desaparece en un máximo de 7 días.</p>
        <p>Si quieres volver, puedes crear una cuenta nueva con este mismo correo, pero empezará vacía.</p>
        <p><strong>Si no has sido tú</strong>, respóndenos a este mensaje: hacía falta tu contraseña para borrarla.</p>
        """;

    public static string TextoDeBaja() =>
        """
        Hola:

        Tu cuenta de Decorazon se ha borrado, con todos los diseños que tenía
        guardados.

        De las copias de seguridad desaparece en un máximo de 7 días.

        Si quieres volver, puedes crear una cuenta nueva con este mismo correo,
        pero empezará vacía.

        Si no has sido tú, respóndenos a este mensaje: hacía falta tu contraseña
        para borrarla.
        """;
}
