using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class StorePdfAndPiecesJointesInDb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheminFichier",
                table: "PiecesJointes");

            migrationBuilder.DropColumn(
                name: "FichierPdfPath",
                table: "Factures");

            migrationBuilder.DropColumn(
                name: "FichierPdfPath",
                table: "Devis");

            migrationBuilder.AddColumn<byte[]>(
                name: "Data",
                table: "PiecesJointes",
                type: "bytea",
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "FichierPdfData",
                table: "Factures",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FichierPdfNom",
                table: "Factures",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "FichierPdfData",
                table: "Devis",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FichierPdfNom",
                table: "Devis",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Data",
                table: "PiecesJointes");

            migrationBuilder.DropColumn(
                name: "FichierPdfData",
                table: "Factures");

            migrationBuilder.DropColumn(
                name: "FichierPdfNom",
                table: "Factures");

            migrationBuilder.DropColumn(
                name: "FichierPdfData",
                table: "Devis");

            migrationBuilder.DropColumn(
                name: "FichierPdfNom",
                table: "Devis");

            migrationBuilder.AddColumn<string>(
                name: "CheminFichier",
                table: "PiecesJointes",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FichierPdfPath",
                table: "Factures",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FichierPdfPath",
                table: "Devis",
                type: "text",
                nullable: true);
        }
    }
}
