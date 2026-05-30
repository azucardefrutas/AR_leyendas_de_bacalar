import React from "react";
import { createBrowserRouter, Navigate } from 'react-router-dom';
import CreatorAccessGuard from '../components/auth/CreatorAccessGuard.jsx';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import RedirectAuthenticatedRoute from '../components/auth/RedirectAuthenticatedRoute.jsx';
import RoleGuard from '../components/auth/RoleGuard.jsx';
import RoleAwareHomeRoute from '../components/auth/RoleAwareHomeRoute.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import CreatorLayout from '../layouts/CreatorLayout.jsx';
import PublicLayout from '../layouts/PublicLayout.jsx';
import ReaderLayout from '../layouts/ReaderLayout.jsx';
import AdminActivityPage from '../pages/admin/AdminActivityPage.jsx';
import AdminAssetsPage from '../pages/admin/AdminAssetsPage.jsx';
import AdminAuthorsPage from '../pages/admin/AdminAuthorsPage.jsx';
import AdminCodeBatchesPage from '../pages/admin/AdminCodeBatchesPage.jsx';
import AdminCodeRequestsPage from '../pages/admin/AdminCodeRequestsPage.jsx';
import AdminCreatorApplicationsPage from '../pages/admin/AdminCreatorApplicationsPage.jsx';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import AdminLegendsPage from '../pages/admin/AdminLegendsPage.jsx';
import AdminReviewsPage from '../pages/admin/AdminReviewsPage.jsx';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage.jsx';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage.jsx';
import AdminSubscriptionsPage from '../pages/admin/AdminSubscriptionsPage.jsx';
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx';
import AuthCallbackPage from '../pages/auth/AuthCallbackPage.jsx';
import CheckEmailPage from '../pages/auth/CheckEmailPage.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import CodeRequestsPage from '../pages/creator/CodeRequestsPage.jsx';
import CreateLegendPage from '../pages/creator/CreateLegendPage.jsx';
import CreatorDashboardPage from '../pages/creator/CreatorDashboardPage.jsx';
import CreatorLegendsPage from '../pages/creator/CreatorLegendsPage.jsx';
import CreatorProfilePage from '../pages/creator/CreatorProfilePage.jsx';
import CreatorReviewsPage from '../pages/creator/CreatorReviewsPage.jsx';
import EditLegendPage from '../pages/creator/EditLegendPage.jsx';
import UploadAssetsPage from '../pages/creator/UploadAssetsPage.jsx';
import AccessDeniedPage from '../pages/public/AccessDeniedPage.jsx';
import CatalogPage from '../pages/public/CatalogPage.jsx';
import CreatorApplyPage from '../pages/public/CreatorApplyPage.jsx';
import CreatorPrivacyPage from '../pages/public/CreatorPrivacyPage.jsx';
import CreatorTermsPage from '../pages/public/CreatorTermsPage.jsx';
import LegendDetailPage from '../pages/public/LegendDetailPage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';
import PrivacyPage from '../pages/public/PrivacyPage.jsx';
import TermsPage from '../pages/public/TermsPage.jsx';
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
      { path: '/', element: <RoleAwareHomeRoute /> },
      { path: '/catalog', element: <CatalogPage /> },
      { path: '/library', element: <LibraryPage /> },
      { path: '/reader/library', element: <LibraryPage /> },
      { path: '/legend/:slug', element: <LegendDetailPage /> },
      { path: '/legend/:slug/read', element: <ReadingPage /> },
      { path: '/about', element: <Navigate to="/#acerca" replace /> },
      { path: '/terms', element: <Navigate to="/terms/readers" replace /> },
      { path: '/privacy', element: <Navigate to="/privacy/readers" replace /> },
      { path: '/creator-terms', element: <Navigate to="/terms/creators" replace /> },
      { path: '/terms/readers', element: <TermsPage /> },
      { path: '/privacy/readers', element: <PrivacyPage /> },
      { path: '/terms/creators', element: <CreatorTermsPage /> },
      { path: '/privacy/creators', element: <CreatorPrivacyPage /> },
      { path: '/creator/apply', element: <CreatorApplyPage /> },
      { path: '/access-denied', element: <AccessDeniedPage /> },
    ],
  },
  {
    element: <RedirectAuthenticatedRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/auth/check-email', element: <CheckEmailPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
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
          { path: 'redeem', element: <RedeemCodePage /> },
          { path: 'purchases', element: <PurchasesPage /> },
          { path: 'subscription', element: <SubscriptionPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'read/:slug', element: <ReadingPage /> },
        ],
      },
      {
        element: <CreatorAccessGuard />,
        children: [
          {
            path: '/creator',
            element: <CreatorLayout />,
            children: [
              { index: true, element: <CreatorDashboardPage /> },
              { path: 'legends', element: <CreatorLegendsPage /> },
              { path: 'drafts', element: <CreatorLegendsPage /> },
              { path: 'legends/new', element: <CreateLegendPage /> },
              { path: 'legends/:id/edit', element: <EditLegendPage /> },
              { path: 'assets', element: <UploadAssetsPage /> },
              { path: 'legends/:legendId/assets', element: <UploadAssetsPage /> },
              { path: 'reviews', element: <CreatorReviewsPage /> },
              { path: 'code-requests', element: <CodeRequestsPage /> },
              { path: 'profile', element: <CreatorProfilePage /> },
            ],
          },
        ],
      },
      {
        element: <RoleGuard allowedRoles={['admin']} />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'creator-applications', element: <AdminCreatorApplicationsPage /> },
              { path: 'authors', element: <AdminAuthorsPage /> },
              { path: 'legends', element: <AdminLegendsPage /> },
              { path: 'reviews', element: <AdminReviewsPage /> },
              { path: 'assets', element: <AdminAssetsPage /> },
              { path: 'codes', element: <AdminCodeRequestsPage /> },
              { path: 'code-requests', element: <AdminCodeRequestsPage /> },
              { path: 'code-batches', element: <AdminCodeBatchesPage /> },
              { path: 'purchases', element: <AdminOrdersPage /> },
              { path: 'orders', element: <AdminOrdersPage /> },
              { path: 'subscriptions', element: <AdminSubscriptionsPage /> },
              { path: 'activity', element: <AdminActivityPage /> },
              { path: 'settings', element: <AdminSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
