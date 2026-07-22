import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginView from "./views/LoginView";
import RegisterView from "./views/RegisterView";
import Marketplace from "./Marketplace";
import PrivateRoute from "./components/PrivateRoute";
import ProfileView from "./views/ProfileView";
// import SellerDashboard from "./views/SellerDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />
        <Route path="/profile" element={<ProfileView view="profile" />} />
        {/* Route path="/seller" element={<SellerDashboard />} /> */}

        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Marketplace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}