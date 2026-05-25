import React from 'react';
import AuthLayout from '../layouts/AuthLayout.jsx';
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
import { roles } from '../lib/roles.js';
import ProtectedRoute from './ProtectedRoute.jsx';
import { Route, Routes } from 'react-router-dom';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="access-denied" element={<AccessDenied />} />

        <Route element={<ProtectedRoute />}>
          <Route path="catalog" element={<Catalog />} />
          <Route path="legend/:id" element={<LegendDetail />} />
          <Route path="reader" element={<ReaderDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[roles.creator]} />}>
          <Route path="creator" element={<CreatorDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[roles.admin]} />}>
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
