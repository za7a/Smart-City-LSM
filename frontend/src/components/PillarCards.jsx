export const PILAR = [
  ["Smart Governance", "Layanan pemerintah yang cepat, transparan, dan mudah diakses secara digital."],
  ["Smart Living", "Fasilitas kesehatan, pendidikan, dan permukiman yang didukung teknologi."],
  ["Smart Economy", "UMKM dan pelaku usaha naik kelas lewat digitalisasi dan data."],
  ["Smart Environment", "Pengelolaan sampah, air, dan energi yang lebih efisien dan berkelanjutan."],
  ["Smart Mobility", "Transportasi dan lalu lintas kota yang lebih lancar dan terpantau."],
  ["Smart People", "Warga yang melek digital dan aktif ikut membangun kota."],
];

export default function PillarCards({ info = [], active, onPick }) {
  const by = Object.fromEntries(info.map((i) => [i.name, i]));
  return (
    <div className="pillar-list" id="pilar" data-ui>
      {PILAR.map(([name, desc]) => {
        const i = by[name] || { total: 0, positif: 0, topik: [] };
        const on = active === name;
        return (
          <button key={name} type="button" className={`pillar-card${on ? " on" : ""}`} aria-pressed={on} onClick={() => onPick(name)}>
            <h3>{name}</h3>
            <p>{desc}</p>
            <div className="pillar-meta">
              <div className="chips">{i.topik.map((w) => <span key={w}>{w}</span>)}</div>
              <p className="pstat"><b>{i.total}</b> tanggapan{i.total ? <> · <b>{i.positif}%</b> positif</> : null}. {on ? "Klik lagi untuk melepas filter." : "Klik untuk memfilter grafik."}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
