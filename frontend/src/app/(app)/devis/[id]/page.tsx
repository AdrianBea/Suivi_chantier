"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DevisModal } from "@/components/DevisModal";
import { api } from "@/lib/api";
import { DevisDto } from "@/lib/types";

export default function DevisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [devis, setDevis] = useState<DevisDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.devis
      .getById(Number(id))
      .then(setDevis)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ fontFamily: "inherit" }}>
      {loading && <div style={{ padding: 40, color: "var(--nm-text-muted)" }}>Chargement…</div>}
      {error && <div style={{ padding: 40, color: "var(--nm-danger)" }}>{error}</div>}

      {devis && (
        <DevisModal
          devis={devis}
          onClose={() => router.push("/devis")}
          onDeleted={() => router.push("/devis")}
          onUpdated={setDevis}
        />
      )}
    </div>
  );
}
