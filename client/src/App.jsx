import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppShell from './layouts/AppShell';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import FarmsList from './pages/FarmsList';
import CreateFarmWizard from './pages/CreateFarmWizard';
import FarmDetails from './pages/FarmDetails';
import CropOptions from './pages/CropOptions';
import BusinessPlanReview from './pages/BusinessPlanReview';
import CropCyclesList from './pages/CropCyclesList';
import CropControlCenter from './pages/CropControlCenter';
import ExpensesManager from './pages/ExpensesManager';
import GovernmentSchemes from './pages/GovernmentSchemes';
import AiAssistantPage from './pages/AiAssistantPage';
import AiHistoryPage from './pages/AiHistoryPage';
import NotFound from './pages/NotFound';
import FarmEnvironment from './components/animations/FarmEnvironment';
import FirstTimeLanguageModal from './i18n/FirstTimeLanguageModal';

export default function App() {
  return (
    <>
      {/* Living Farm Animation Layer (non-blocking pointer-events: none) */}
      <FarmEnvironment />

      {/* First-time Native Language Selection Prompt */}
      <FirstTimeLanguageModal />

      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Farm Application Pages wrapped in AppShell */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <ErrorBoundary
                title="Something went wrong"
                message="The dashboard could not be loaded."
              >
                <Dashboard />
              </ErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <Profile />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms"
        element={
          <ProtectedRoute>
            <AppShell>
              <FarmsList />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/new"
        element={
          <ProtectedRoute>
            <AppShell>
              <CreateFarmWizard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/:farmId"
        element={
          <ProtectedRoute>
            <AppShell>
              <FarmDetails />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/:farmId/crops"
        element={
          <ProtectedRoute>
            <AppShell>
              <CropOptions />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/:farmId/analyze"
        element={
          <ProtectedRoute>
            <AppShell>
              <CropOptions />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/:farmId/business-plan/:planId"
        element={
          <ProtectedRoute>
            <AppShell>
              <BusinessPlanReview />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/:farmId/crop-cycles"
        element={
          <ProtectedRoute>
            <AppShell>
              <CropCyclesList />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/:farmId/crop-cycles/:cycleId"
        element={
          <ProtectedRoute>
            <AppShell>
              <CropControlCenter />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/:farmId/expenses"
        element={
          <ProtectedRoute>
            <AppShell>
              <ExpensesManager />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/:farmId/schemes"
        element={
          <ProtectedRoute>
            <AppShell>
              <GovernmentSchemes />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai"
        element={
          <ProtectedRoute>
            <AppShell>
              <AiAssistantPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai/history"
        element={
          <ProtectedRoute>
            <AppShell>
              <AiHistoryPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
