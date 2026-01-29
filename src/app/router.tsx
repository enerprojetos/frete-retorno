import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/auth/ProtectedRoute'
import Home from '@/pages/Home'
import Login from '@/auth/pages/Login'
import Register from '@/auth/pages/Register'
import ShipperDashboard from '@/features/shipper/pages/Dashboard'
import FreightCreate from '@/features/shipper/pages/FreightCreate'
import FreightList from '@/features/shipper/pages/FreightList'
import DriverDashboard from '@/features/driver/pages/Dashboard'
import TripCreate from '@/features/driver/pages/TripCreate'
import TripList from '@/features/driver/pages/TripList'
import TripMatches from '@/features/trips/pages/TripMatches'
import AdminOverview from '@/features/admin/pages/Overview'
import FreightEdit from '@/features/shipper/pages/FreightEdit'
import MatchInbox from '@/features/shipper/pages/MatchInbox'


export const appRouter = createBrowserRouter([
  // ✅ HOME pública
  { path: '/', element: <Home /> },

  // ✅ compatibilidade
  { path: '/login', element: <Navigate to="/auth/login" replace /> },
  { path: '/register', element: <Navigate to="/auth/register" replace /> },

  // Auth
  { path: '/auth/login', element: <Login /> },
  { path: '/auth/register', element: <Register /> },

  // Shipper
  {
    path: '/shipper',
    element: (
      <ProtectedRoute allow={['SHIPPER', 'OPERATOR']}>
        <ShipperDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/shipper/freights',
    element: (
      <ProtectedRoute allow={['SHIPPER', 'OPERATOR']}>
        <FreightList />
      </ProtectedRoute>
    ),
  },
  {
    path: '/shipper/freights/new',
    element: (
      <ProtectedRoute allow={['SHIPPER', 'OPERATOR']}>
        <FreightCreate />
      </ProtectedRoute>
    ),
  },

  // Driver
  {
    path: '/driver',
    element: (
      <ProtectedRoute allow={['DRIVER', 'OPERATOR']}>
        <DriverDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/driver/trips',
    element: (
      <ProtectedRoute allow={['DRIVER', 'OPERATOR']}>
        <TripList />
      </ProtectedRoute>
    ),
  },
  {
    path: '/driver/trips/new',
    element: (
      <ProtectedRoute allow={['DRIVER', 'OPERATOR']}>
        <TripCreate />
      </ProtectedRoute>
    ),
  },
  {
    path: '/driver/trips/:id/matches',
    element: (
      <ProtectedRoute allow={['DRIVER', 'OPERATOR']}>
        <TripMatches />
      </ProtectedRoute>
    ),
  },

  // Admin
  {
    path: '/admin',
    element: (
      <ProtectedRoute allow={['OPERATOR']}>
        <AdminOverview />
      </ProtectedRoute>
    ),
  },

  {
    path: '/shipper/freights/:id/edit',
    element: (
      <ProtectedRoute allow={['SHIPPER', 'OPERATOR']}>
        <FreightEdit />
      </ProtectedRoute>
    ),
  },

  {
    path: '/shipper/requests',
    element: (
      <ProtectedRoute allow={['SHIPPER', 'OPERATOR']}>
        <MatchInbox />
      </ProtectedRoute>
    ),
  },
  {
    path: '/shipper/inbox',
    element: (
      <ProtectedRoute allow={['SHIPPER', 'OPERATOR']}>
        <MatchInbox />
      </ProtectedRoute>
    ),
  },


])
