import React, { lazy } from "react";
import { createBrowserRouter, Navigate } from 'react-router-dom';
// Guards + layouts stay static: they are tiny and form the persistent shell that
// must render instantly (and a Suspense boundary inside each layout shell handles
// the lazy page chunks below, so the navbar/sidebar stays visible while loading).
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
// Public fast-path pages stay static so the most-visited routes paint immediately.
import AccessDeniedPage from '../pages/public/AccessDeniedPage.jsx';
import CatalogPage from '../pages/public/CatalogPage.jsx';
import CreatorApplyPage from '../pages/public/CreatorApplyPage.jsx';
import CreatorConfirmPage from '../pages/public/CreatorConfirmPage.jsx';
import CreatorPrivacyPage from '../pages/public/CreatorPrivacyPage.jsx';
import CreatorTermsPage from '../pages/public/CreatorTermsPage.jsx';
import LegendDetailPage from '../pages/public/LegendDetailPage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';
import PrivacyPage from '../pages/public/PrivacyPage.jsx';
import TermsPage from '../pages/public/TermsPage.jsx';

// Lazy-loaded route trees: each becomes its own chunk so it no longer ships in the
// initial bundle. Admin pulls recharts, creator pulls the editor, reader pulls the
// book viewer, auth pulls the login forms — none of which the first paint needs.
const AdminActivityPage = lazy(() => import('../pages/admin/AdminActivityPage.jsx'));
const AdminAssetsPage = lazy(() => import('../pages/admin/AdminAssetsPage.jsx'));
const AdminAuthorsPage = lazy(() => import('../pages/admin/AdminAuthorsPage.jsx'));
const AdminCodeBatchesPage = lazy(() => import('../pages/admin/AdminCodeBatchesPage.jsx'));
const AdminCodeRequestsPage = lazy(() => import('../pages/admin/AdminCodeRequestsPage.jsx'));
const AdminCreatorApplicationsPage = lazy(() => import('../pages/admin/AdminCreatorApplicationsPage.jsx'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage.jsx'));
const AdminLegendsPage = lazy(() => import('../pages/admin/AdminLegendsPage.jsx'));
const AdminReviewsPage = lazy(() => import('../pages/admin/AdminReviewsPage.jsx'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage.jsx'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage.jsx'));
const AdminSubscriptionsPage = lazy(() => import('../pages/admin/AdminSubscriptionsPage.jsx'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage.jsx'));
const AuthCallbackPage = lazy(() => import('../pages/auth/AuthCallbackPage.jsx'));
const CheckEmailPage = lazy(() => import('../pages/auth/CheckEmailPage.jsx'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage.jsx'));
const CodeRequestsPage = lazy(() => import('../pages/creator/CodeRequestsPage.jsx'));
const CreateLegendPage = lazy(() => import('../pages/creator/CreateLegendPage.jsx'));
const CreatorDashboardPage = lazy(() => import('../pages/creator/CreatorDashboardPage.jsx'));
const CreatorLegendsPage = lazy(() => import('../pages/creator/CreatorLegendsPage.jsx'));
const CreatorProfilePage = lazy(() => import('../pages/creator/CreatorProfilePage.jsx'));
const CreatorReviewsPage = lazy(() => import('../pages/creator/CreatorReviewsPage.jsx'));
const EditLegendPage = lazy(() => import('../pages/creator/EditLegendPage.jsx'));
const UploadAssetsPage = lazy(() => import('../pages/creator/UploadAssetsPage.jsx'));
const LibraryPage = lazy(() => import('../pages/reader/LibraryPage.jsx'));
const ProfilePage = lazy(() => import('../pages/reader/ProfilePage.jsx'));
const PurchasesPage = lazy(() => import('../pages/reader/PurchasesPage.jsx'));
const ReadingPage = lazy(() => import('../pages/reader/ReadingPage.jsx'));
const RedeemCodePage = lazy(() => import('../pages/reader/RedeemCodePage.jsx'));
const SubscriptionPage = lazy(() => import('../pages/reader/SubscriptionPage.jsx'));

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
      { path: '/creator/confirm', element: <CreatorConfirmPage /> },
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
