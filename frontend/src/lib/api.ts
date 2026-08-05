import { AdminUserDto, ComparaisonDto, DevisCreateDto, DevisDto, DevisUpdateDto, EntrepriseDto, EntrepriseUpsertDto, FactureCreateDto, FactureDto, FactureUpdateDto, HealthDto, LignePosteUpsertDto, LlmExchangeDto, LlmExchangeListDto, LlmStatsDto, OpenRouterSettingsDto, PieceJointeDto, TestResultDto, UpdateProfileDto, UserDto } from "./types";
import { fetchAvecRetry, humanizeError, isHumanMessage, type Retry } from "./errors";

// Same-origin: rewrites in next.config.ts proxy /api/* to the backend so the
// ASP.NET auth cookie (scoped to this origin) travels with every request.
export const API_BASE = "";

async function request<T>(path: string, init?: RequestInit, retry?: Retry): Promise<T> {
  const res = await fetchAvecRetry(
    () =>
      fetch(`${API_BASE}${path}`, {
        ...init,
        credentials: "include",
        signal: retry ? AbortSignal.timeout(retry.timeoutMs) : init?.signal,
      }),
    retry,
  );
  if (res.status === 401 && typeof window !== "undefined") {
    // Le cookie peut être expiré côté serveur tout en restant présent (HttpOnly) côté navigateur :
    // sans le SignOut, proxy.ts (hasSession = simple présence du cookie) renvoie /login -> / en boucle.
    if (path === "/api/auth/login") {
      const text = await res.text().catch(() => "");
      throw new Error(isHumanMessage(text) ? text.trim() : "Email ou mot de passe incorrect.");
    }
    if (path !== "/api/auth/logout") {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    }
    if (window.location.pathname !== "/login") window.location.href = "/login";
    throw new Error("Session expirée.");
  }
  if (!res.ok) {
    throw new Error(await humanizeError(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    signup: (
      email: string,
      password: string,
      passwordConfirmation: string,
      dateDebutChantier: string | null,
      dateLivraisonPrevue: string | null,
    ) =>
      request<UserDto>("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          passwordConfirmation,
          dateDebutChantier,
          dateLivraisonPrevue,
        }),
      }),
    // Login idempotent : le rejouer après un timeout ne crée rien côté serveur.
    login: (email: string, password: string, onRetry?: (tentative: number) => void) =>
      request<UserDto>(
        "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
        { timeoutMs: 20_000, retries: 2, onRetry },
      ),
    logout: () => request<void>("/api/auth/logout", { method: "POST" }),
    me: () => request<UserDto>("/api/auth/me"),
    updateMe: (dto: UpdateProfileDto) =>
      request<UserDto>("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
  },
  devis: {
    list: (params?: { lot?: string; statut?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.lot) qs.set("lot", params.lot);
      if (params?.statut) qs.set("statut", params.statut);
      if (params?.page) qs.set("page", String(params.page));
      return request<DevisDto[]>(`/api/devis?${qs}`);
    },
    getById: (id: number) => request<DevisDto>(`/api/devis/${id}`),
    create: (dto: DevisCreateDto) =>
      request<DevisDto>("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    update: (id: number, dto: DevisUpdateDto) =>
      request<DevisDto>(`/api/devis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    import: (file: File, mode: string = "Texte") => {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      return request<DevisDto>("/api/devis/import", { method: "POST", body: form });
    },
    delete: (id: number) => request<void>(`/api/devis/${id}`, { method: "DELETE" }),
    addLigne: (devisId: number, dto: LignePosteUpsertDto) =>
      request<DevisDto>(`/api/devis/${devisId}/lignes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    updateLigne: (devisId: number, ligneId: number, dto: LignePosteUpsertDto) =>
      request<DevisDto>(`/api/devis/${devisId}/lignes/${ligneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    deleteLigne: (devisId: number, ligneId: number) =>
      request<DevisDto>(`/api/devis/${devisId}/lignes/${ligneId}`, { method: "DELETE" }),
    deleteAllLignes: (devisId: number) =>
      request<DevisDto>(`/api/devis/${devisId}/lignes`, { method: "DELETE" }),
    recalculer: (devisId: number) =>
      request<DevisDto>(`/api/devis/${devisId}/recalculer`, { method: "POST" }),
    echanges: (id: number) => request<LlmExchangeDto[]>(`/api/devis/${id}/echanges`),
    attachPdf: (id: number, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<DevisDto>(`/api/devis/${id}/pdf`, { method: "POST", body: form });
    },
    pdfUrl: (id: number) => `${API_BASE}/api/devis/${id}/pdf`,
  },
  factures: {
    list: (params?: { page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      return request<FactureDto[]>(`/api/factures?${qs}`);
    },
    getById: (id: number) => request<FactureDto>(`/api/factures/${id}`),
    create: (dto: FactureCreateDto) =>
      request<FactureDto>("/api/factures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    update: (id: number, dto: FactureUpdateDto) =>
      request<FactureDto>(`/api/factures/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    import: (file: File, devisId?: number, mode: string = "Texte") => {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      const qs = devisId ? `?devisId=${devisId}` : "";
      return request<FactureDto>(`/api/factures/import${qs}`, { method: "POST", body: form });
    },
    lier: (factureId: number, devisId: number) =>
      request<void>(`/api/factures/${factureId}/lier/${devisId}`, { method: "PATCH" }),
    delete: (id: number) => request<void>(`/api/factures/${id}`, { method: "DELETE" }),
    comparaison: (factureId: number) =>
      request<ComparaisonDto>(`/api/factures/${factureId}/comparaison`),
    addLigne: (factureId: number, dto: LignePosteUpsertDto) =>
      request<FactureDto>(`/api/factures/${factureId}/lignes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    updateLigne: (factureId: number, ligneId: number, dto: LignePosteUpsertDto) =>
      request<FactureDto>(`/api/factures/${factureId}/lignes/${ligneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    deleteLigne: (factureId: number, ligneId: number) =>
      request<FactureDto>(`/api/factures/${factureId}/lignes/${ligneId}`, { method: "DELETE" }),
    echanges: (id: number) => request<LlmExchangeDto[]>(`/api/factures/${id}/echanges`),
    pdfUrl: (id: number) => `${API_BASE}/api/factures/${id}/pdf`,
    piecesJointes: (factureId: number) =>
      request<PieceJointeDto[]>(`/api/factures/${factureId}/pieces-jointes`),
    uploadPieceJointe: (factureId: number, file: File, libelle?: string) => {
      const form = new FormData();
      form.append("file", file);
      if (libelle) form.append("libelle", libelle);
      return request<PieceJointeDto>(`/api/factures/${factureId}/pieces-jointes`, { method: "POST", body: form });
    },
    deletePieceJointe: (factureId: number, pieceId: number) =>
      request<void>(`/api/factures/${factureId}/pieces-jointes/${pieceId}`, { method: "DELETE" }),
    pieceJointeUrl: (factureId: number, pieceId: number) =>
      `${API_BASE}/api/factures/${factureId}/pieces-jointes/${pieceId}`,
  },
  entreprises: {
    list: () => request<EntrepriseDto[]>("/api/entreprises"),
    create: (dto: EntrepriseUpsertDto) =>
      request<EntrepriseDto>("/api/entreprises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    update: (id: number, dto: EntrepriseUpsertDto) =>
      request<EntrepriseDto>(`/api/entreprises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    delete: (id: number) => request<void>(`/api/entreprises/${id}`, { method: "DELETE" }),
  },
  admin: {
    users: () => request<AdminUserDto[]>("/api/admin/users"),
    setAdmin: (id: number, isAdmin: boolean) =>
      request<void>(`/api/admin/users/${id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin }),
      }),
    deleteUser: (id: number) => request<void>(`/api/admin/users/${id}`, { method: "DELETE" }),
    llmStats: () => request<LlmStatsDto>("/api/admin/llm/stats"),
    llmExchanges: (params?: { succes?: boolean; modele?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.succes !== undefined) qs.set("succes", String(params.succes));
      if (params?.modele) qs.set("modele", params.modele);
      if (params?.page) qs.set("page", String(params.page));
      return request<LlmExchangeListDto[]>(`/api/admin/llm/exchanges?${qs}`);
    },
    llmExchange: (id: number) => request<LlmExchangeDto>(`/api/admin/llm/exchanges/${id}`),
    health: () => request<HealthDto>("/api/admin/health"),
  },
  settings: {
    get: () => request<OpenRouterSettingsDto>("/api/settings"),
    test: () => request<TestResultDto>("/api/settings/test", { method: "POST" }),
    reset: () => request<void>("/api/settings/reset", { method: "POST" }),
  },
};
