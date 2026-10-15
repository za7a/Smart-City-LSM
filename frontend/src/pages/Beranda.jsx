import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { api } from "../api.js";
import PillarCards, { PILAR } from "../components/PillarCards.jsx";
import { KECAMATAN } from "../constants.js";

gsap.registerPlugin(ScrollTrigger);

const SENT = { Positif: "var(--chart-positive)", Netral: "var(--chart-neutral)", Negatif: "var(--chart-negative)" };
const BL = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)"];
const tip = { background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 12, color: "var(--ink)" };
const go = (id, block = "start") => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block });

export default function Beranda() {
  const root = useRef(null);
  const [f, setF] = useState({ start: "", end: "", pilar: "", kecamatan: "" });
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    let active = true;
    setLoading(true); setErr("");
    const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    api("/dashboard?" + q).then((data) => { if (active) setD(data); }).catch((e) => { if (active) setErr(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [f]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const sync = () => setCompact(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(".hero-recap", { y: 28, scale: 0.96, opacity: 0.2 }, { y: 0, scale: 1, opacity: 1, duration: 0.8, ease: "power3.out" });
      gsap.utils.toArray(".reveal-on-scroll").forEach((node) => {
        gsap.fromTo(node, { y: 24, opacity: 0.15 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: node, start: "top 84%", once: true } });
      });
    });
    return () => media.revert();
  }, { scope: root });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pick = (p) => { setF({ ...f, pilar: f.pilar === p ? "" : p }); go("filters", "center"); };
  const likertKecOptions = Array.from(new Set([...KECAMATAN, ...(d?.likert_kecamatan_list || [])]));
  const pos = d?.sentimen.find((s) => s.name === "Positif")?.value || 0;
  const max = Math.max(1, ...(d?.words || []).map((w) => w.value));
  const positiveRate = d?.total ? Math.round((pos / d.total) * 100) : "—";

  return (
    <div ref={root}>
      <section className="hero">
        <div className="hero-copy">
          <h1>Suara warga, terbaca.</h1>
          <p className="lede">Pantau tanggapan warga Lhokseumawe tentang layanan, lingkungan, mobilitas, dan kehidupan kota dalam satu tempat.</p>
          <div className="cta-row">
            <button className="btn" onClick={() => go("dash")}>Lihat hasil analisis</button>
            <button className="btn-ghost" onClick={() => go("pilar", "center")}>Kenali 6 pilar</button>
          </div>
        </div>
        <div className="hero-visual" data-ui aria-label="Ringkasan analisis warga">
          <div className="hero-recap">
            <div className="recap-lead"><p className="eyeline">Analisis warga Lhokseumawe</p><strong>{d ? "Data yang terus dibaca." : "Menyiapkan pembacaan data."}</strong></div>
            <div><span className="recap-label">Tanggapan terverifikasi</span><strong className="recap-value">{d?.total ?? "—"}</strong></div>
            <div><span className="recap-label">Sentimen positif</span><strong className="recap-value">{positiveRate}{positiveRate === "—" ? "" : "%"}</strong></div>
          </div>
        </div>
      </section>

      <div className="section-head reveal-on-scroll" id="dash"><h2>Apa kata warga sejauh ini</h2><p>Ringkasan komentar Instagram dan jawaban survei yang sudah dianalisis. Ubah filter untuk melihat periode atau pilar tertentu.</p></div>
      <div className="filters" id="filters">
        <label>Dari<br /><input type="date" className="input" value={f.start} onChange={set("start")} /></label>
        <label>Sampai<br /><input type="date" className="input" value={f.end} onChange={set("end")} /></label>
        <label>Pilar<br /><select className="input" value={f.pilar} onChange={set("pilar")}><option value="">Semua pilar</option>{PILAR.map(([p]) => <option key={p}>{p}</option>)}</select></label>
        <button className="btn-line" onClick={() => setF({ start: "", end: "", pilar: "", kecamatan: "" })}>Atur ulang</button>
      </div>

      {err && <p className="dashboard-state is-error" role="alert">Data belum dapat dimuat. {err} <button className="btn-line" onClick={() => setF({ ...f })}>Coba lagi</button></p>}
      {loading && !d && <p className="dashboard-state" aria-live="polite">Memuat ringkasan suara warga.</p>}
      {d && (d.total === 0 ? <p className="card">Belum ada data untuk filter ini.</p> : (
        <div className={`dash-grid${loading ? " is-loading" : ""}`} aria-busy={loading}>
          <div className="card full" data-ui style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
            <div><p className="muted small">Total tanggapan</p><p className="metric">{d.total}</p></div>
            <div><p className="muted small">Sentimen positif</p><p className="metric">{Math.round((pos / d.total) * 100)}%</p></div>
            <div><p className="muted small">Pilar terpopuler</p><p className="metric">{d.pilar[0]?.name}</p></div>
          </div>
          <div className="card"><h3>Sentimen warga</h3>
            <div style={{ position: "relative" }}>
              <ResponsiveContainer width="100%" height={230}><PieChart>
                <Pie data={d.sentimen} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} stroke="none">
                  {d.sentimen.map((s) => <Cell key={s.name} fill={SENT[s.name]} />)}</Pie><Tooltip contentStyle={tip} /></PieChart></ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontWeight: 700, fontSize: 22 }}>{d.total}</div>
            </div>
            <div className="small muted" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              {Object.entries(SENT).map(([k, c]) => { const v = d.sentimen.find((s) => s.name === k)?.value || 0; return <span key={k}><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: c, marginRight: 5 }} />{k} {Math.round((v / d.total) * 100)}%</span>; })}
            </div>
          </div>
          <div className="card"><h3>Jumlah komentar berdasarkan topik</h3>
            <p className="muted small" style={{ margin: "-6px 0 8px" }}>Total tanggapan pada tiap pilar Smart City, sesuai filter tanggal yang aktif.</p>
            <ResponsiveContainer width="100%" height={compact ? 300 : 280}><BarChart data={d.pilar} layout="vertical" margin={{ right: compact ? 16 : 28 }}>
              <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={compact ? 96 : 130} tick={{ fill: "currentColor", fontSize: compact ? 11 : 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tip} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" radius={4}>{d.pilar.map((_, i) => <Cell key={i} fill={BL[i % BL.length]} />)}<LabelList dataKey="value" position="right" fill="currentColor" fontSize={12} fontWeight={700} /></Bar></BarChart></ResponsiveContainer></div>
          <div className="card full"><h3>Kata yang sering disebut</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", alignItems: "baseline" }}>
              {d.words.map((w, i) => <span key={w.text} style={{ fontSize: 14 + (w.value / max) * 26, color: BL[i % 3], fontWeight: 700 }}>{w.text} <small style={{ fontSize: 12, fontWeight: 400, color: "var(--mut)" }}>{w.persen}%</small></span>)}</div>
            <p className="small muted" style={{ marginTop: 12 }}>Persentase menunjukkan porsi komentar yang menyebut kata tersebut.</p></div>
        </div>
      ))}

      {d?.likert?.length > 0 && (
        <div className="card full" style={{ marginTop: 24 }}>
          {likertKecOptions.length > 0 && (
            <label className="small muted" style={{ display: "inline-block", marginBottom: 10 }}>
              {/*Kecamatan pengisi<br />*/}
              <select className="input" value={f.kecamatan} onChange={set("kecamatan")}>
                <option value="">Semua kecamatan</option>
                {likertKecOptions.map((k) => <option key={k}>{k}</option>)}
              </select>
            </label>
          )}
          <h3>Hasil kuesioner (skala 1–5)</h3>
          <p className="muted small" style={{ margin: "-6px 0 14px" }}>1 = Sangat Setuju &middot; 2 = Setuju &middot; 3 = Netral &middot; 4 = Tidak Setuju &middot; 5 = Sangat Tidak Setuju. Persentase menggabungkan jawaban Setuju + Sangat Setuju. Filter kecamatan di atas hanya berlaku untuk pengisi kuesioner ini.</p>
          {d.likert.length ? d.likert.map((q) => (
            <div key={q.pertanyaan} style={{ margin: "0 0 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{q.pertanyaan}</span>
                <span className="muted small" style={{ whiteSpace: "nowrap" }}>{q.n} jawaban</span>
              </div>
              <div className="bar-track" style={{ marginTop: 6 }}><div style={{ width: `${q.persen_setuju}%`, height: 10, borderRadius: 4, background: "var(--chart-positive)" }} /></div>
              <p className="small muted" style={{ margin: "4px 0 0" }}>{q.persen_setuju}% setuju/sangat setuju &middot; {q.persen_tidak_setuju}% tidak setuju/sangat tidak setuju</p>
            </div>
          )) : <p className="muted small">Belum ada jawaban kuesioner untuk kecamatan/periode ini.</p>}
        </div>
      )}

      <div className="section-head reveal-on-scroll"><h2>Enam cara warga melihat kota</h2><p>Pilih salah satu pilar untuk memusatkan analisis pada isu yang paling relevan. Pilihan aktif langsung diterapkan pada grafik di atas.</p></div>
      <PillarCards info={d?.pilar_info} active={f.pilar} onPick={pick} />
    </div>
  );
}
