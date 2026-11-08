using System.Security.Claims;
using Decorazon.Infraestructura.Seguridad;
using Microsoft.AspNetCore.Authorization;

namespace Decorazon.Api.Endpoints;

/// <summary>Políticas de autorización con nombre, además de la de «con sesión».</summary>
public static class Politicas
{
    /// <summary>Exige el claim de administrador que el emisor pone a los correos de la configuración.</summary>
    public const string Administrador = "administrador";

    public static void Anadir(AuthorizationOptions opciones) =>
        opciones.AddPolicy(Administrador, politica => politica
            .RequireAuthenticatedUser()
            .RequireClaim(ClaimsPropios.Administrador, ClaimsPropios.ValorDeAdministrador));

    /// <summary>Si el token de la sesión lleva el claim de administrador.</summary>
    public static bool EsAdministrador(this ClaimsPrincipal usuario) =>
        usuario.HasClaim(ClaimsPropios.Administrador, ClaimsPropios.ValorDeAdministrador);
}
