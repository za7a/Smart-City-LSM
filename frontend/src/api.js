export const isAdmin = () => !!localStorage.getItem("token");
export async function api(path, { json, headers = {}, ...opts } = {}) {
  const t = localStorage.getItem("token");
  if (t) headers.Authorization = `Bearer ${t}`;
  if (json) { headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(json); }
  const r = await fetch("/api" + path, { ...opts, headers });
  if (r.status === 401 && t) { localStorage.removeItem("token"); location.href = "/login"; }
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
  return r.json();
}
