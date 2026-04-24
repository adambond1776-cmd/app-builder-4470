// Shared API helper — always sends cookies.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
