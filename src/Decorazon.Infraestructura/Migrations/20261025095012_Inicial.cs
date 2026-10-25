using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Decorazon.Infraestructura.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "solicitudes_de_registro",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    correo = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    hash_del_token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    fecha_de_creacion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_de_caducidad = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_de_consumo = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    diseno_contenido = table.Column<string>(type: "jsonb", nullable: true),
                    diseno_nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    diseno_tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_solicitudes_de_registro", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    correo = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    hash_de_contrasena = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    fecha_de_alta = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_de_cambio_de_contrasena = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version_de_credenciales = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_usuarios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "disenos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    contenido = table.Column<string>(type: "jsonb", nullable: false),
                    fecha_de_creacion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_de_modificacion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_disenos", x => x.id);
                    table.ForeignKey(
                        name: "fk_disenos_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "solicitudes_de_contrasena",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    hash_del_token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    fecha_de_creacion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_de_caducidad = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_de_consumo = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_solicitudes_de_contrasena", x => x.id);
                    table.ForeignKey(
                        name: "fk_solicitudes_de_contrasena_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_disenos_usuario_modificacion",
                table: "disenos",
                columns: new[] { "usuario_id", "fecha_de_modificacion" });

            migrationBuilder.CreateIndex(
                name: "ix_solicitudes_contrasena_hash_del_token",
                table: "solicitudes_de_contrasena",
                column: "hash_del_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_solicitudes_contrasena_usuario",
                table: "solicitudes_de_contrasena",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "ix_solicitudes_correo",
                table: "solicitudes_de_registro",
                column: "correo");

            migrationBuilder.CreateIndex(
                name: "ix_solicitudes_hash_del_token",
                table: "solicitudes_de_registro",
                column: "hash_del_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_usuarios_correo",
                table: "usuarios",
                column: "correo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "disenos");

            migrationBuilder.DropTable(
                name: "solicitudes_de_contrasena");

            migrationBuilder.DropTable(
                name: "solicitudes_de_registro");

            migrationBuilder.DropTable(
                name: "usuarios");
        }
    }
}
