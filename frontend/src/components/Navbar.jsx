import { NavLink, Link } from "react-router-dom";
import { isAdmin } from "../api.js";
import { useTheme } from "../theme.js";

const SUN = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
const MOON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;

export default function Navbar() {
  const [theme, toggle] = useTheme();
  const label = theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap";
  const cls = ({ isActive }) => (isActive ? "active" : "");
  return (
    <header className="site-header">
      <nav className="nav">
        <Link to="/" className="brand"><img src="/banner_diskom.png" alt="" /><span>Smart City Lhokseumawe</span></Link>
        <div className="nav-links">
          <NavLink to="/" end className={cls}>Beranda</NavLink>
          {isAdmin() && <>
            <NavLink to="/mengambil-data" className={cls}>Mengambil Data</NavLink>
            <NavLink to="/data-learning" className={cls}>Data Learning</NavLink>
          </>}
        </div>
        <div className="nav-actions">
          <button type="button" className="tt" onClick={toggle} aria-label={label} title={label}>{theme === "dark" ? SUN : MOON}</button>
          {isAdmin()
            ? <button className="link" onClick={() => { localStorage.removeItem("token"); location.href = "/"; }}>Keluar</button>
            : <NavLink to="/login" className="cta">Login</NavLink>}
        </div>
      </nav>
    </header>
  );
}
