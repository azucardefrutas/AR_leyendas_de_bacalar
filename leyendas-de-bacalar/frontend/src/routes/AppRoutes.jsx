import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import AccessDenied from '../pages/AccessDenied.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import Catalog from '../pages/Catalog.jsx';
import CreatorDashboard from '../pages/CreatorDashboard.jsx';
import Home from '../pages/Home.jsx';
import LegendDetail from '../pages/LegendDetail.jsx';
import Login from '../pages/Login.jsx';
import NotFound from '../pages/NotFound.jsx';
import ReaderDashboard from '../pages/ReaderDashboard.jsx';
import Register from '../pages/Register.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="legends/:legendId" element={<LegendDetail />} />
        <Route path="access-denied" element={<AccessDenied />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      <Route path="dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="reader" replace />} />
        <Route path="reader" element={<ReaderDashboard />} />
        <Route path="creator" element={<CreatorDashboard />} />
        <Route path="admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
