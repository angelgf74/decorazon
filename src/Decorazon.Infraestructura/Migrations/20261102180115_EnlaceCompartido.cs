using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Decorazon.Infraestructura.Migrations
{
    /// <inheritdoc />
    public partial class EnlaceCompartido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "enlace_compartido",
                table: "disenos",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_disenos_enlace_compartido",
                table: "disenos",
                column: "enlace_compartido",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_disenos_enlace_compartido",
                table: "disenos");

            migrationBuilder.DropColumn(
                name: "enlace_compartido",
                table: "disenos");
        }
    }
}
