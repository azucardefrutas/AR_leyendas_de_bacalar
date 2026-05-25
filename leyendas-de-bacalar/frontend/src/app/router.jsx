import React from "react";
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import RoleGuard from '../components/auth/RoleGuard.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import CreatorLayout from '../layouts/CreatorLayout.jsx';
import PublicLayout from '../layouts/PublicLayout.jsx';
import ReaderLayout from '../layouts/ReaderLayout.jsx';
import AdminAuditPage from '../pages/admin/AdminAuditPage.jsx';
import AdminCodesPage from '../pages/admin/AdminCodesPage.jsx';
import AdminCreatorApplicationsPage from '../pages/admin/AdminCreatorApplicationsPage.jsx';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import AdminLegendsReviewPage from '../pages/admin/AdminLegendsReviewPage.jsx';
import AdminPhysicalEditionsPage from '../pages/admin/AdminPhysicalEditionsPage.jsx';
import AdminProductsPage from '../pages/admin/AdminProductsPage.jsx';
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import CodeRequestsPage from '../pages/creator/CodeRequestsPage.jsx';
import CreateLegendPage from '../pages/creator/CreateLegendPage.jsx';
import CreatorDashboardPage from '../pages/creator/CreatorDashboardPage.jsx';
import CreatorLegendsPage from '../pages/creator/CreatorLegendsPage.jsx';
import CreatorReviewsPage from '../pages/creator/CreatorReviewsPage.jsx';
import EditLegendPage from '../pages/creator/EditLegendPage.jsx';
import UploadAssetsPage from '../pages/creator/UploadAssetsPage.jsx';
import AccessDeniedPage from '../pages/public/AccessDeniedPage.jsx';
import CatalogPage from '../pages/public/CatalogPage.jsx';
import HomePage from '../pages/public/HomePage.jsx';
import LegendDetailPage from '../pages/public/LegendDetailPage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';
import LibraryPage from '../pages/reader/LibraryPage.jsx';
import ProfilePage from '../pages/reader/ProfilePage.jsx';
import PurchasesPage from '../pages/reader/PurchasesPage.jsx';
import ReadingPage from '../pages/reader/ReadingPage.jsx';
import RedeemCodePage from '../pages/reader/RedeemCodePage.jsx';
import SubscriptionPage from '../pages/reader/SubscriptionPage.jsx';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/catalog', element: <CatalogPage /> },
      { path: '/legend/:slug', element: <LegendDetailPage /> },
      { path: '/access-denied', element: <AccessDeniedPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/reader',
        element: <ReaderLayout />,
        children: [
          { index: true, element: <Navigate to="/reader/library" replace /> },
          { path: 'library', element: <LibraryPage /> },
          { path: 'redeem', element: <RedeemCodePage /> },
          { path: 'purchases', element: <PurchasesPage /> },
          { path: 'subscription', element: <SubscriptionPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'read/:slug', element: <ReadingPage /> },
        ],
      },
      {
        element: <RoleGuard allowedRoles={['creator']} />,
        children: [
          {
            path: '/creator',
            element: <CreatorLayout />,
            children: [
              { index: true, element: <CreatorDashboardPage /> },
              { path: 'legends', element: <CreatorLegendsPage /> },
              { path: 'legends/new', element: <CreateLegendPage /> },
              { path: 'legends/:legendId/edit', element: <EditLegendPage /> },
              { path: 'legends/:legendId/assets', element: <UploadAssetsPage /> },
              { path: 'reviews', element: <CreatorReviewsPage /> },
              { path: 'code-requests', element: <CodeRequestsPage /> },
            ],
          },
        ],
      },
      {
        element: <RoleGuard allowedRoles={['admin', 'super_admin']} />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'creator-applications', element: <AdminCreatorApplicationsPage /> },
              { path: 'legends-review', element: <AdminLegendsReviewPage /> },
              { path: 'codes', element: <AdminCodesPage /> },
              { path: 'physical-editions', element: <AdminPhysicalEditionsPage /> },
              { path: 'products', element: <AdminProductsPage /> },
              { path: 'audit', element: <AdminAuditPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
