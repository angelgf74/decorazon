using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Decorazon.Infraestructura.Migrations
{
    /// <inheritdoc />
    public partial class VersionesAnteriores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "versiones_anteriores",
                columns: table => new
                {
                    diseno_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    contenido = table.Column<string>(type: "jsonb", nullable: false),
                    fecha = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_versiones_anteriores", x => x.diseno_id);
                    table.ForeignKey(
                        name: "fk_versiones_anteriores_disenos_diseno_id",
                        column: x => x.diseno_id,
                        principalTable: "disenos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "versiones_anteriores");
        }
    }
}
