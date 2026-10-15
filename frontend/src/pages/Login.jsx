import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const nav = useNavigate();
  async function submit(e) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/auth/login", { method: "POST", body: new URLSearchParams({ username: u, password: p }) });
    const j = await r.json();
    if (!r.ok) return setErr(j.detail || "Gagal masuk");
    localStorage.setItem("token", j.access_token); nav("/mengambil-data"); location.reload();
  }
  return (
    <form onSubmit={submit} className="card max-w-sm mx-auto mt-16 space-y-3">
      <h1 className="text-2xl font-extrabold">Masuk sebagai admin</h1>
      <label className="form-label">Username<input className="input w-full" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} /></label>
      <label className="form-label">Kata sandi<input className="input w-full" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /></label>
      {err && <p className="form-error" role="alert">{err}</p>}
      <button className="btn w-full">Masuk</button>
    </form>
  );
}
