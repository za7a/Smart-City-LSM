import { useEffect, useState } from "react";
import { api } from "../api.js";

const PILAR = ["Smart Governance", "Smart Environment", "Smart Mobility", "Smart Economy", "Smart Living", "Smart People", "Lainnya"];
const SENT = ["Positif", "Netral", "Negatif"];
const PER_HALAMAN = 50;

export default function DataLearning() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [only, setOnly] = useState(false);
  const [st, setSt] = useState({ pesan: "" });
  const [ring, setRing] = useState(null);

  const load = () => {
    api(`/admin/nlp?unverified=${only}&page=${page}&page_size=${PER_HALAMAN}`).then((r) => { setRows(r.rows); setTotal(r.total); });
    api("/admin/status").then(setSt);
    api("/admin/ringkasan").then(setRing);
  };
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [only, page]);
  useEffect(() => { setPage(1); }, [only]);

  const edit = (id, k, v) => setRows(rows.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const save = (r) => api(`/admin/nlp/${r.id}`, { method: "PATCH", json: { pilar: r.pilar, sentimen: r.sentimen } }).then(() => { edit(r.id, "is_verified", true); api("/admin/ringkasan").then(setRing); });

  const runNlp = () => api("/admin/nlp/run", { method: "POST" }).then(() => { setPage(1); load(); });
  const verifyAll = () => {
    if (!confirm("Verifikasi semua data yang belum diverifikasi tanpa dikoreksi satu per satu? Data ini baru akan ikut ditampilkan di analisis Beranda setelah diverifikasi.")) return;
    api("/admin/nlp/verify-all", { method: "POST" }).then(() => { setPage(1); load(); });
  };

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));

  return (
    <div className="py-8 space-y-4">
      <h1 className="text-3xl font-extrabold">Data Learning</h1>
      {ring && (
        <p className="text-sm text-mut">
          Total data: <b className="text-ink">{ring.total_data}</b> &middot; Sudah diproses NLP: <b className="text-ink">{ring.sudah_diproses}</b> &middot;
          Terverifikasi: <b className="text-ink">{ring.terverifikasi}</b> &middot; Belum diverifikasi: <b className="text-ink">{ring.belum_diverifikasi}</b>
          {ring.belum_diproses > 0 && <> &middot; {ring.belum_diproses} data belum diproses (klik "Jalankan Model NLP")</>}
        </p>
      )}
      <p className="text-xs text-mut" style={{ marginTop: -8 }}>Hanya data yang sudah <b>diverifikasi</b> yang ikut dihitung di analisis Beranda.</p>

      <div className="flex flex-col items-start gap-2">
        <button className="btn" onClick={runNlp}>Jalankan Model NLP</button>
        <button className="btn-line" onClick={verifyAll} disabled={!ring || ring.belum_diverifikasi === 0}>Verifikasi Semua Data</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Hanya yang belum diverifikasi</label>
        <span className="text-sm">{st.pesan}</span>
      </div>

      <div className="card overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="text-left"><th className="p-2">Teks</th><th>Pilar</th><th>Sentimen</th><th>Skor</th><th></th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} className="align-top">
            <td className="p-2 max-w-md">{r.teks}{r.kolom ? <><br /><span className="s">{r.kolom}</span></> : null}</td>
            <td><select className="input" value={r.pilar} onChange={(e) => edit(r.id, "pilar", e.target.value)}>{PILAR.map((p) => <option key={p}>{p}</option>)}</select></td>
            <td><select className="input" value={r.sentimen} onChange={(e) => edit(r.id, "sentimen", e.target.value)}>{SENT.map((p) => <option key={p}>{p}</option>)}</select></td>
            <td>{Number(r.skor).toFixed(2)}</td>
            <td><button className="btn" onClick={() => save(r)}>{r.is_verified ? "Terverifikasi" : "Simpan"}</button></td>
          </tr>))}</tbody></table>
        {!rows.length && <p className="p-2">Belum ada data untuk ditampilkan di halaman ini. Ambil data dulu, lalu jalankan model NLP.</p>}
      </div>

      {total > PER_HALAMAN && (
        <div className="flex items-center gap-3">
          <button className="btn-line" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
          <span className="text-sm text-mut">Halaman {page} dari {totalHalaman} ({total} baris)</span>
          <button className="btn-line" disabled={page >= totalHalaman} onClick={() => setPage((p) => p + 1)}>Selanjutnya</button>
        </div>
      )}
    </div>
  );
}
