import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import TeamPage from '@/pages/TeamPage'
import InitiativesPage from '@/pages/InitiativesPage'
import StandupsPage from '@/pages/StandupsPage'
import TasksPage from '@/pages/TasksPage'
import PipelinePage from '@/pages/PipelinePage'
import TemplatesPage from '@/pages/TemplatesPage'
import AdminPage from '@/pages/AdminPage'
import WeeklySummaryPage from '@/pages/WeeklySummaryPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"  element={<DashboardPage />} />
              <Route path="/standups"   element={<StandupsPage />} />
              <Route path="/projects"   element={<InitiativesPage />} />
              <Route path="/tasks"      element={<TasksPage />} />
              <Route path="/pipeline"   element={<PipelinePage />} />
              <Route path="/team"       element={<TeamPage />} />
              <Route path="/templates"  element={<TemplatesPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/weekly-summary"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <WeeklySummaryPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
