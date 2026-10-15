import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function MengambilData() {
  const [url, setUrl] = useState(""); const [st, setSt] = useState({ state: "idle", pesan: "" }); const [src, setSrc] = useState([]); const [msg, setMsg] = useState("");
  const load = () => { api("/admin/status").then(setSt); api("/admin/sumber").then(setSrc); };
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, []);
  const scrape = () => api("/admin/scrape", { method: "POST", json: { url } }).then(load).catch((e) => setMsg(e.message));
  const upload = (e) => {
    const fd = new FormData(); fd.append("file", e.target.files[0]);
    api("/admin/upload", { method: "POST", body: fd })
      .then((r) => {
        const bagian = [];
        if (r.masuk_teks) bagian.push(`${r.masuk_teks} teks/komentar`);
        if (r.masuk_likert) bagian.push(`${r.masuk_likert} jawaban skala (${r.kolom_likert.join(", ")})`);
        setMsg(bagian.length ? `${bagian.join(" & ")} masuk.` : "Tidak ada baris yang bisa diproses.");
        load();
      })
      .catch((x) => setMsg(x.message));
  };
  return (
    <div className="py-8 space-y-5">
      <h1 className="text-3xl font-extrabold">Mengambil Data</h1>
      <div className="card space-y-3">
        <h2 className="font-bold">Komentar postingan Instagram</h2>
        <p className="s" style={{ margin: "0 0 8px" }}>Tempel URL postingan atau reel Instagram yang publik. Komentar diambil lewat layanan Apify (perlu <code>APIFY_API_TOKEN</code> di <code>.env</code>); prosesnya bisa memakan waktu beberapa saat dan memakai kuota Apify Anda.</p>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-64" placeholder="https://www.instagram.com/p/... atau /reel/..." value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn" disabled={!url || st.state === "running"} onClick={scrape}>Mulai Scraping</button></div>
        <h2 className="font-bold pt-2">Unggah CSV survei atau komentar</h2>
        <p className="s" style={{ margin: "0 0 8px" }}>Kolom yang dikenali otomatis: <code>teks</code>/<code>komentar</code> (opsional), <code>waktu</code>, <code>kecamatan</code>. Kolom lain berisi angka 1–5 otomatis dianggap pernyataan skala kuesioner; kolom teks bebas lainnya (mis. "Kritik dan Saran", "Keinginan Masa Depan untuk Kota Lhokseumawe") otomatis dianalisis seperti komentar.</p>
        <input type="file" accept=".csv" onChange={upload} />
        {msg && <p className="status-message" aria-live="polite">{msg}</p>}
        <p className={`status-message ${st.state === "error" ? "is-error" : ""}`} aria-live="polite">Status: {st.pesan}</p>
        {st.state === "done" && <Link to="/data-learning" className="btn inline-block">Lanjut ke Data Learning</Link>}
      </div>
      <div className="card"><h2 className="font-bold mb-2">Riwayat pengambilan</h2>
        {src.map((s) => <p key={s.id} className="text-sm py-2">{s.jenis_sumber} · {s.url_atau_referensi} · {new Date(s.tanggal_diambil).toLocaleString("id-ID")}</p>)}</div>
    </div>
  );
}
