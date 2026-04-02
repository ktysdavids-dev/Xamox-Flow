import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MARKETING_URL, PLAY_STORE_URL } from "../config";

export default function PaywallPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const nextPath = new URLSearchParams(location.search).get("next") || "/select-profession";

  const buyUrl = `${MARKETING_URL}/pricing`;

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4" data-testid="paywall-page">
      <div className="card panel-premium p-6 w-full max-w-lg text-center">
        <img src="/logo-xamox.png" alt="Xamox Flow" style={{ width: 96, height: 96, margin: "0 auto 12px" }} />
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--gold)" }}>Xamox Flow Premium</h1>
        <p className="text-[var(--text-muted)] mt-2">
          Para jugar en la web necesitas una licencia activa. Compra en la landing y vuelve aquí para desbloquear.
        </p>

        <div className="mt-5 space-y-3">
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" className="btn-gold block py-3 rounded-xl font-bold">
            Comprar acceso web (promo)
          </a>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn-outline-gold block py-3 rounded-xl font-bold">
            Descargar app Android
          </a>
          <button onClick={() => navigate(nextPath)} className="w-full py-3 rounded-xl border border-[var(--border)] hover:border-[var(--gold)]">
            Ya he pagado - reintentar acceso
          </button>
        </div>
      </div>
    </div>
  );
}
