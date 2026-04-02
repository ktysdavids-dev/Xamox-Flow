/**
 * API del juego.
 *
 * En el build de producción servido desde FastAPI (:8000 u otro), usamos siempre
 * rutas relativas "/api/..." = mismo host y puerto que la página. Así no dependemos
 * de window.location.port (a veces vacío en móviles) ni de IPs incrustadas.
 *
 * En desarrollo (npm start en :3000), la API va a http://<host>:8000.
 */

const envUrlBuild = (process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/$/, '');
const isProdBundle = process.env.NODE_ENV === 'production';

function isPrivateLanHost(host) {
  if (!host) return false;
  return (
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host.endsWith('.local')
  );
}

/**
 * null → usar prefijo relativo "/api" (mismo origen que la página).
 * string → origen absoluto del backend (sin barra final).
 */
function resolveBackendOriginAbsolute() {
  if (typeof window === 'undefined') {
    return envUrlBuild || null;
  }

  const host = window.location.hostname;
  const port = window.location.port;

  if (envUrlBuild) {
    return envUrlBuild;
  }

  if (!isProdBundle) {
    if (isPrivateLanHost(host)) {
      return port === '3000' ? `http://${host}:8000` : window.location.origin;
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    return window.location.origin;
  }

  // Build de producción: preview estático en :3000 con API en 8000
  if (port === '3000' && (isPrivateLanHost(host) || host === 'localhost' || host === '127.0.0.1')) {
    return `http://${host}:8000`;
  }

  // Mismo servidor que sirve el HTML (JUGAR_MOVIL, Render, etc.)
  return null;
}

const _originAbs = resolveBackendOriginAbsolute();

export const API =
  _originAbs == null || _originAbs === ''
    ? '/api'
    : `${String(_originAbs).replace(/\/$/, '')}/api`;

export const MARKETING_URL = (process.env.REACT_APP_MARKETING_URL || 'https://www.xamoxflow.com').replace(/\/$/, '');
export const PLAY_STORE_URL =
  (process.env.REACT_APP_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.xamoxflow.app').trim();

/** Origen HTTP del backend (para OAuth y enlaces absolutos). */
export function getBackendHttpOrigin() {
  if (typeof window === 'undefined') {
    return envUrlBuild ? envUrlBuild.replace(/\/$/, '') : '';
  }
  if (_originAbs == null || _originAbs === '') {
    return window.location.origin;
  }
  return String(_originAbs).replace(/\/$/, '');
}

/** Origen ws/wss alineado con la API. */
export function getWebsocketOrigin() {
  if (typeof window === 'undefined') return '';
  const o = getBackendHttpOrigin();
  if (!o) return '';
  return o.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
}
