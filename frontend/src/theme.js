import { useEffect, useState } from "react";
const cur = () => document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light");
export function useTheme() {
  const [t, setT] = useState(cur());
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme:dark)"), h = () => setT(cur());
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  const toggle = () => {
    const n = t === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = n;
    try { localStorage.setItem("sc_theme", n); } catch (e) {}
    setT(n);
  };
  return [t, toggle];
}
