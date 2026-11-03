using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Decorazon.Infraestructura.Migrations
{
    /// <inheritdoc />
    public partial class VistasPrevias : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vistas_previas",
                columns: table => new
                {
                    diseno_id = table.Column<Guid>(type: "uuid", nullable: false),
                    imagen = table.Column<byte[]>(type: "bytea", nullable: false),
                    fecha = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vistas_previas", x => x.diseno_id);
                    table.ForeignKey(
                        name: "fk_vistas_previas_disenos_diseno_id",
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
                name: "vistas_previas");
        }
    }
}
