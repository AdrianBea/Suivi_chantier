export type UserDto = {
  id: number;
  email: string;
  isAdmin: boolean;
  dateDebutChantier: string | null;
  dateLivraisonPrevue: string | null;
  nom: string | null;
  prenom: string | null;
  adresse: string | null;
};

export interface UpdateProfileDto {
  nom?: string | null;
  prenom?: string | null;
  adresse?: string | null;
  dateDebutChantier?: string | null;
  dateLivraisonPrevue?: string | null;
}

// --- Administration (miroirs de backend/DTOs/AdminDto.cs) ---

export type AdminUserDto = {
  id: number;
  email: string;
  nom: string | null;
  prenom: string | null;
  isAdmin: boolean;
  createdAt: string;
  nbDevis: number;
  nbFactures: number;
  nbEntreprises: number;
  octetsStockes: number;
};

/** Échange LLM allégé : sans les prompts, trop lourds pour une liste. */
export type LlmExchangeListDto = {
  id: number;
  typeDocument: "Devis" | "Facture";
  documentId: number;
  batch: number;
  modele: string;
  nbImages: number;
  dureeMs: number;
  succes: boolean;
  erreur: string | null;
  createdAt: string;
};

export type ModeleStatDto = {
  modele: string;
  total: number;
  echecs: number;
  dureeMoyenneMs: number;
};

export type JourStatDto = { jour: string; total: number; echecs: number };

export type LlmStatsDto = {
  total: number;
  echecs: number;
  tauxSucces: number;
  dureeMoyenneMs: number;
  dureeP95Ms: number;
  parModele: ModeleStatDto[];
  septDerniersJours: JourStatDto[];
};

export type HealthDto = {
  dbConnectee: boolean;
  version: string;
  uptimeHeures: number;
  nbUtilisateurs: number;
  tailleBaseOctets: number;
  octetsPdfStockes: number;
  devisEnErreur: number;
  facturesEnErreur: number;
};

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
  tvaTaux?: number;
  totalHt?: number;
  totalTtc?: number;
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
  fichierPdfNom?: string;
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
  fichierPdfNom?: string;
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
  totalTtcDevis?: number;
  totalTtcFacture?: number;
  ecartTotalTtc: number;
  hasDiscrepancies: boolean;
  modeComparaison: "Lignes" | "Total";
  montantDejaFacture: number;
  resteAFacturer: number;
  lignes: LigneComparaisonDto[];
}

export interface OpenRouterSettingsDto {
  model: string;
  apiKey: string;
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
