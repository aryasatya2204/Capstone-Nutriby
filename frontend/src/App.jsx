import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landingPage";
import Dashboard from "./pages/dashboard";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import Information from "./pages/Information";
import Features from "./pages/Features";
import WeeklyPlan from "./pages/Features/WeeklyPlan";
import SearchMenu from "./pages/Features/SearchMenu";
import Nutribot from "./pages/Features/Nutribot";
import GrowthTracker from "./pages/Features/GrowthTracker";

function App() {
  return (
    <Routes>
      {/* Landing Page sebagai halaman utama (semua pop-up menempel di sini) */}
      <Route path="/" element={<LandingPage />} />

      {/* Rute Terlindungi (Hanya Dashboard) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/information" element={<Information />} />
        <Route path="/features" element={<Features />} />
        <Route path="/features/weekly-plan" element={<WeeklyPlan />} />
        <Route path="/features/search-menu" element={<SearchMenu />} />
        <Route path="/features/nutribot" element={<Nutribot />} />
        <Route path="/features/growth-tracker" element={<GrowthTracker />} />
      </Route>
    </Routes>
  );
}

export default App;
