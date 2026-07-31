export type StatutExtraction = "EnAttente" | "Extrait" | "Erreur";
export type TypeFacture = "Facture" | "Acompte" | "Solde";

export type TypeLot =
  | "TerrassementVrd"
  | "GrosOeuvre"
  | "CharpenteCouverture"
  | "Menuiserie"
  | "Platrerie"
  | "PlomberieSanitaire"
  | "Electricite"
  | "IsolationAuSol"
  | "Chauffage"
  | "ChapeLiquide"
  | "Carrelage"
  | "IsolationDesCombles"
  | "Facades"
  | "Permis"
  | "MaitriseOeuvre";

export const TYPE_LOT_LABELS: Record<TypeLot, string> = {
  TerrassementVrd: "Terrassement + VRD",
  GrosOeuvre: "Gros œuvre",
  CharpenteCouverture: "Charpente couverture",
  Menuiserie: "Menuiserie",
  Platrerie: "Plâtrerie",
  PlomberieSanitaire: "Plomberie sanitaire",
  Electricite: "Électricité",
  IsolationAuSol: "Isolation au sol",
  Chauffage: "Chauffage",
  ChapeLiquide: "Chape liquide",
  Carrelage: "Carrelage",
  IsolationDesCombles: "Isolation des combles",
  Facades: "Façades",
  Permis: "Permis",
  MaitriseOeuvre: "Maîtrise d'œuvre",
};

export const TYPE_LOT_VALUES = Object.keys(TYPE_LOT_LABELS) as TypeLot[];

export const TYPE_LOT_COLORS: Record<TypeLot, string> = {
  TerrassementVrd: "#A16207",
  GrosOeuvre: "#cfcfcf",
  CharpenteCouverture: "#B45309",
  Menuiserie: "#0D9488",
  Platrerie: "#D6D3D1",
  PlomberieSanitaire: "#3B82F6",
  Electricite: "#FCD34D",
  IsolationAuSol: "#F472B6",
  Chauffage: "#FB7185",
  ChapeLiquide: "#94A3B8",
  Carrelage: "#FB923C",
  IsolationDesCombles: "#F9A8D4",
  Facades: "#2DD4BF",
  Permis: "#C4B5FD",
  MaitriseOeuvre: "#60A5FA",
};

export interface EntrepriseDto {
  id: number;
  nom: string;
  siret?: string;
  contactNom?: string;
  contactTel?: string;
  contactEmail?: string;
  adresse?: string;
}

export interface EntrepriseUpsertDto {
  nom: string;
  siret?: string;
  contactNom?: string;
  contactTel?: string;
  contactEmail?: string;
  adresse?: string;
}

export interface DevisUpdateDto {
  numeroDevis?: string;
  lot?: string;
  typeLot?: TypeLot;
  dateDevis?: string;
  entrepriseId?: number;
  entrepriseNom?: string;
  tvaTaux?: number;
  totalHt?: number;
  totalTtc?: number;
}

export interface DevisCreateDto {
  entrepriseId?: number;
  entrepriseNom?: string;
  numeroDevis?: string;
  lot?: string;
  typeLot?: TypeLot;
  dateDevis?: string;
}

export interface FactureUpdateDto {
  entrepriseId?: number;
  entrepriseNom?: string;
  numeroFacture?: string;
  typeLot?: TypeLot;
  dateFacture?: string;
  dateEcheance?: string;
}

export interface FactureCreateDto {
  entrepriseId?: number;
  entrepriseNom?: string;
  devisId?: number;
  numeroFacture?: string;
  typeLot?: TypeLot;
  dateFacture?: string;
  dateEcheance?: string;
}

export interface LignePosteDto {
  id: number;
  ordre: number;
  description: string;
  quantite?: number;
  unite?: string;
  prixUnitaire?: number;
  totalLigne?: number;
}

export interface LignePosteUpsertDto {
  ordre: number;
  description: string;
  quantite?: number;
  unite?: string;
  prixUnitaire?: number;
  totalLigne?: number;
}

export interface DevisDto {
  id: number;
  numeroDevis?: string;
  lot?: string;
  typeLot?: TypeLot;
  dateDevis?: string;
  dateValidite?: string;
  delaiExecution?: string;
  totalHt?: number;
  tvaTaux?: number;
  tvaMontant?: number;
  totalTtc?: number;
  statut: StatutExtraction;
  createdAt: string;
  hasPdf: boolean;
  entreprise?: EntrepriseDto;
  lignes: LignePosteDto[];
}

export interface LigneFactureDto {
  id: number;
  ordre: number;
  description: string;
  quantite?: number;
  unite?: string;
  prixUnitaire?: number;
  totalLigne?: number;
}

export interface PieceJointeDto {
  id: number;
  nomFichier: string;
  contentType: string;
  tailleOctets: number;
  libelle?: string;
  createdAt: string;
}

export interface FactureDto {
  id: number;
  devisId?: number;
  numeroFacture?: string;
  typeFacture: TypeFacture;
  typeLot?: TypeLot;
  dateFacture?: string;
  dateEcheance?: string;
  totalHt?: number;
  tvaTaux?: number;
  tvaMontant?: number;
  totalTtc?: number;
  statut: StatutExtraction;
  createdAt: string;
  hasPdf: boolean;
  entreprise?: EntrepriseDto;
  lignes: LigneFactureDto[];
  piecesJointes: PieceJointeDto[];
}

export interface LigneComparaisonDto {
  factureLigneId: number;
  devisLigneId?: number;
  descriptionFacture: string;
  descriptionDevis?: string;
  quantiteDevis?: number;
  quantiteFacture?: number;
  prixUnitaireDevis?: number;
  prixUnitaireFacture?: number;
  ecartPrix?: number;
  ecartQuantite?: number;
  nonMatche: boolean;
}

export interface ComparaisonDto {
  factureId: number;
  devisId: number;
  entrepriseNom: string;
  totalHtDevis?: number;
  totalHtFacture?: number;
  ecartTotalHt: number;
  hasDiscrepancies: boolean;
  modeComparaison: "Lignes" | "Total";
  montantDejaFacture: number;
  resteAFacturer: number;
  lignes: LigneComparaisonDto[];
}

export interface LmStudioSettingsDto {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface DatabaseSettingsDto {
  server: string;
  database: string;
  user: string;
  password: string;
}

export interface FullSettingsDto {
  lmStudio: LmStudioSettingsDto;
  database: DatabaseSettingsDto;
}

export interface LmStudioModelsDto {
  models: string[];
}

export interface TestResultDto {
  success: boolean;
  message: string;
}

export interface LlmExchangeDto {
  id: number;
  batch: number;
  modele: string;
  systemPrompt: string;
  userPrompt: string;
  nbImages: number;
  reponseBrute?: string;
  dureeMs: number;
  succes: boolean;
  erreur?: string;
  createdAt: string;
}
