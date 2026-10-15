import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Beranda from "./pages/Beranda.jsx";
import Login from "./pages/Login.jsx";
import MengambilData from "./pages/MengambilData.jsx";
import DataLearning from "./pages/DataLearning.jsx";
import { isAdmin } from "./api.js";

const Guard = ({ children }) => (isAdmin() ? children : <Navigate to="/login" replace />);

export default function App() {
  return (
    <>
      <Navbar />
      <main className="shell app-main">
        <Routes>
          <Route path="/" element={<Beranda />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mengambil-data" element={<Guard><MengambilData /></Guard>} />
          <Route path="/data-learning" element={<Guard><DataLearning /></Guard>} />
        </Routes>
      </main>
      <footer className="site-footer">Pemerintah Kota Lhokseumawe · Program Smart City</footer>
    </>
  );
}
