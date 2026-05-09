// Shared API helper — always sends cookies.
const configuredBackendUrl = process.env.REACT_APP_BACKEND_URL;

function normalizeOrigin(origin) {
  return origin ? origin.replace(/\/+$/, "") : "";
}

function resolveBackendUrl() {
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname === "maxcoach.app" || hostname === "www.maxcoach.app") {
      return origin;
    }
  }
  return normalizeOrigin(configuredBackendUrl) || (typeof window !== "undefined" ? window.location.origin : "");
}

const BACKEND_URL = resolveBackendUrl();
export const API = `${BACKEND_URL}/api`;

export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (res.status === 401) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return res;
}

export async function apiJSON(path, opts = {}) {
  const res = await apiFetch(path, opts);
  if (!res.ok) {
    let detail = "Request failed";
    try { detail = (await res.json()).detail || detail; } catch {}
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
