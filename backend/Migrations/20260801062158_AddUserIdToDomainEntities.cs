using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToDomainEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Factures_EntrepriseId_NumeroFacture",
                table: "Factures");

            migrationBuilder.DropIndex(
                name: "IX_Entreprises_Siret",
                table: "Entreprises");

            migrationBuilder.DropIndex(
                name: "IX_Devis_EntrepriseId_NumeroDevis",
                table: "Devis");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Factures",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Entreprises",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Devis",
                type: "integer",
                nullable: true);

            // ponytail: backfill vers le plus ancien compte (celui promu admin manuellement après signup) —
            // les données pré-existantes n'avaient pas de propriétaire, on les rattache à l'admin d'origine.
            // Sur une base vierge il n'y a rien à rattacher : on ne bloque que s'il existe des lignes
            // orphelines ET aucun compte pour les recevoir (sinon UserId NOT NULL serait impossible).
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM "Users")
                       AND (EXISTS (SELECT 1 FROM "Entreprises")
                            OR EXISTS (SELECT 1 FROM "Devis")
                            OR EXISTS (SELECT 1 FROM "Factures")) THEN
                        RAISE EXCEPTION 'AddUserIdToDomainEntities: des données existent sans aucun compte — créez un compte (POST /api/auth/signup) avant d''appliquer cette migration.';
                    END IF;
                END $$;

                UPDATE "Entreprises" SET "UserId" = (SELECT "Id" FROM "Users" ORDER BY "Id" LIMIT 1) WHERE "UserId" IS NULL;
                UPDATE "Devis" SET "UserId" = (SELECT "Id" FROM "Users" ORDER BY "Id" LIMIT 1) WHERE "UserId" IS NULL;
                UPDATE "Factures" SET "UserId" = (SELECT "Id" FROM "Users" ORDER BY "Id" LIMIT 1) WHERE "UserId" IS NULL;
                """);

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "Factures",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "Entreprises",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "Devis",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Factures_EntrepriseId",
                table: "Factures",
                column: "EntrepriseId");

            migrationBuilder.CreateIndex(
                name: "IX_Factures_UserId_EntrepriseId_NumeroFacture",
                table: "Factures",
                columns: new[] { "UserId", "EntrepriseId", "NumeroFacture" },
                unique: true,
                filter: "\"NumeroFacture\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Entreprises_UserId_Siret",
                table: "Entreprises",
                columns: new[] { "UserId", "Siret" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Devis_EntrepriseId",
                table: "Devis",
                column: "EntrepriseId");

            migrationBuilder.CreateIndex(
                name: "IX_Devis_UserId_EntrepriseId_NumeroDevis",
                table: "Devis",
                columns: new[] { "UserId", "EntrepriseId", "NumeroDevis" },
                unique: true,
                filter: "\"NumeroDevis\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Devis_Users_UserId",
                table: "Devis",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Entreprises_Users_UserId",
                table: "Entreprises",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Factures_Users_UserId",
                table: "Factures",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Devis_Users_UserId",
                table: "Devis");

            migrationBuilder.DropForeignKey(
                name: "FK_Entreprises_Users_UserId",
                table: "Entreprises");

            migrationBuilder.DropForeignKey(
                name: "FK_Factures_Users_UserId",
                table: "Factures");

            migrationBuilder.DropIndex(
                name: "IX_Factures_EntrepriseId",
                table: "Factures");

            migrationBuilder.DropIndex(
                name: "IX_Factures_UserId_EntrepriseId_NumeroFacture",
                table: "Factures");

            migrationBuilder.DropIndex(
                name: "IX_Entreprises_UserId_Siret",
                table: "Entreprises");

            migrationBuilder.DropIndex(
                name: "IX_Devis_EntrepriseId",
                table: "Devis");

            migrationBuilder.DropIndex(
                name: "IX_Devis_UserId_EntrepriseId_NumeroDevis",
                table: "Devis");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Factures");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Entreprises");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Devis");

            migrationBuilder.CreateIndex(
                name: "IX_Factures_EntrepriseId_NumeroFacture",
                table: "Factures",
                columns: new[] { "EntrepriseId", "NumeroFacture" },
                unique: true,
                filter: "\"NumeroFacture\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Entreprises_Siret",
                table: "Entreprises",
                column: "Siret",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Devis_EntrepriseId_NumeroDevis",
                table: "Devis",
                columns: new[] { "EntrepriseId", "NumeroDevis" },
                unique: true,
                filter: "\"NumeroDevis\" IS NOT NULL");
        }
    }
}
