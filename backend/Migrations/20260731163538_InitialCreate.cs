using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Entreprises",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nom = table.Column<string>(type: "text", nullable: false),
                    Siret = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ContactNom = table.Column<string>(type: "text", nullable: true),
                    ContactTel = table.Column<string>(type: "text", nullable: true),
                    ContactEmail = table.Column<string>(type: "text", nullable: true),
                    Adresse = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Entreprises", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LlmExchanges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TypeDocument = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DocumentId = table.Column<int>(type: "integer", nullable: false),
                    Batch = table.Column<int>(type: "integer", nullable: false),
                    Modele = table.Column<string>(type: "text", nullable: false),
                    SystemPrompt = table.Column<string>(type: "text", nullable: false),
                    UserPrompt = table.Column<string>(type: "text", nullable: false),
                    NbImages = table.Column<int>(type: "integer", nullable: false),
                    ReponseBrute = table.Column<string>(type: "text", nullable: true),
                    DureeMs = table.Column<int>(type: "integer", nullable: false),
                    Succes = table.Column<bool>(type: "boolean", nullable: false),
                    Erreur = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LlmExchanges", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Devis",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EntrepriseId = table.Column<int>(type: "integer", nullable: true),
                    NumeroDevis = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Lot = table.Column<string>(type: "text", nullable: true),
                    TypeLot = table.Column<int>(type: "integer", nullable: true),
                    DateDevis = table.Column<DateOnly>(type: "date", nullable: true),
                    DateValidite = table.Column<DateOnly>(type: "date", nullable: true),
                    DelaiExecution = table.Column<string>(type: "text", nullable: true),
                    TotalHt = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    TvaTaux = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    TvaMontant = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    TotalTtc = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Statut = table.Column<string>(type: "text", nullable: false),
                    FichierPdfPath = table.Column<string>(type: "text", nullable: true),
                    ExtractionBrute = table.Column<string>(type: "text", nullable: true),
                    ReponseBrute = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Devis", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Devis_Entreprises_EntrepriseId",
                        column: x => x.EntrepriseId,
                        principalTable: "Entreprises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Factures",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DevisId = table.Column<int>(type: "integer", nullable: true),
                    EntrepriseId = table.Column<int>(type: "integer", nullable: true),
                    NumeroFacture = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TypeFacture = table.Column<string>(type: "text", nullable: false),
                    TypeLot = table.Column<int>(type: "integer", nullable: true),
                    DateFacture = table.Column<DateOnly>(type: "date", nullable: true),
                    DateEcheance = table.Column<DateOnly>(type: "date", nullable: true),
                    TotalHt = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    TvaTaux = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    TvaMontant = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    TotalTtc = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Statut = table.Column<string>(type: "text", nullable: false),
                    FichierPdfPath = table.Column<string>(type: "text", nullable: true),
                    ExtractionBrute = table.Column<string>(type: "text", nullable: true),
                    ReponseBrute = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Factures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Factures_Devis_DevisId",
                        column: x => x.DevisId,
                        principalTable: "Devis",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Factures_Entreprises_EntrepriseId",
                        column: x => x.EntrepriseId,
                        principalTable: "Entreprises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LignesPoste",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DevisId = table.Column<int>(type: "integer", nullable: false),
                    Ordre = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Quantite = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Unite = table.Column<string>(type: "text", nullable: true),
                    PrixUnitaire = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    TotalLigne = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LignesPoste", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LignesPoste_Devis_DevisId",
                        column: x => x.DevisId,
                        principalTable: "Devis",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PiecesJointes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FactureId = table.Column<int>(type: "integer", nullable: false),
                    NomFichier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CheminFichier = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TailleOctets = table.Column<long>(type: "bigint", nullable: false),
                    Libelle = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PiecesJointes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PiecesJointes_Factures_FactureId",
                        column: x => x.FactureId,
                        principalTable: "Factures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LignesFacture",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FactureId = table.Column<int>(type: "integer", nullable: false),
                    LignePosteId = table.Column<int>(type: "integer", nullable: true),
                    Ordre = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Quantite = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Unite = table.Column<string>(type: "text", nullable: true),
                    PrixUnitaire = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    TotalLigne = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LignesFacture", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LignesFacture_Factures_FactureId",
                        column: x => x.FactureId,
                        principalTable: "Factures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LignesFacture_LignesPoste_LignePosteId",
                        column: x => x.LignePosteId,
                        principalTable: "LignesPoste",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Devis_EntrepriseId_NumeroDevis",
                table: "Devis",
                columns: new[] { "EntrepriseId", "NumeroDevis" },
                unique: true,
                filter: "\"NumeroDevis\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Entreprises_Siret",
                table: "Entreprises",
                column: "Siret",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Factures_DevisId",
                table: "Factures",
                column: "DevisId");

            migrationBuilder.CreateIndex(
                name: "IX_Factures_EntrepriseId_NumeroFacture",
                table: "Factures",
                columns: new[] { "EntrepriseId", "NumeroFacture" },
                unique: true,
                filter: "\"NumeroFacture\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_LignesFacture_FactureId",
                table: "LignesFacture",
                column: "FactureId");

            migrationBuilder.CreateIndex(
                name: "IX_LignesFacture_LignePosteId",
                table: "LignesFacture",
                column: "LignePosteId");

            migrationBuilder.CreateIndex(
                name: "IX_LignesPoste_DevisId",
                table: "LignesPoste",
                column: "DevisId");

            migrationBuilder.CreateIndex(
                name: "IX_LlmExchanges_TypeDocument_DocumentId",
                table: "LlmExchanges",
                columns: new[] { "TypeDocument", "DocumentId" });

            migrationBuilder.CreateIndex(
                name: "IX_PiecesJointes_FactureId",
                table: "PiecesJointes",
                column: "FactureId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LignesFacture");

            migrationBuilder.DropTable(
                name: "LlmExchanges");

            migrationBuilder.DropTable(
                name: "PiecesJointes");

            migrationBuilder.DropTable(
                name: "LignesPoste");

            migrationBuilder.DropTable(
                name: "Factures");

            migrationBuilder.DropTable(
                name: "Devis");

            migrationBuilder.DropTable(
                name: "Entreprises");
        }
    }
}
