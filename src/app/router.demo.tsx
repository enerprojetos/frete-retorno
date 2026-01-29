import { createBrowserRouter, Navigate } from 'react-router-dom'

import DemoLogin from '@/demo/auth/DemoLogin'
import RequireDemoAuth from '@/demo/auth/RequireDemoAuth'

import DemoShell from '@/shared/ui/DemoShell'

import SeedDemoData from '@/demo/seed/SeedDemoData'
import AdminDashboard from '@/demo/admin/AdminDashboard'

import FreightForm from '@/features/freights/pages/FreightForm'
import TripForm from '@/features/trips/pages/TripForm'
import TripMatches from '@/features/trips/pages/TripMatches'

export const demoRouter = createBrowserRouter([
  { path: '/', element: <Navigate to="/demo/login" replace /> },

  {
    path: '/demo/login',
    element: (
      <DemoShell>
        <DemoLogin />
      </DemoShell>
    ),
  },

  {
    path: '/demo/seed',
    element: (
      <DemoShell>
        <RequireDemoAuth allow={['SHIPPER', 'OPERATOR']}>
          <SeedDemoData />
        </RequireDemoAuth>
      </DemoShell>
    ),
  },

  {
    path: '/admin',
    element: (
      <DemoShell>
        <RequireDemoAuth allow={['OPERATOR']}>
          <AdminDashboard />
        </RequireDemoAuth>
      </DemoShell>
    ),
  },

  {
    path: '/freights/new',
    element: (
      <DemoShell>
        <RequireDemoAuth allow={['SHIPPER', 'OPERATOR']}>
          <FreightForm />
        </RequireDemoAuth>
      </DemoShell>
    ),
  },

  {
    path: '/trips/new',
    element: (
      <DemoShell>
        <RequireDemoAuth allow={['DRIVER', 'OPERATOR']}>
          <TripForm />
        </RequireDemoAuth>
      </DemoShell>
    ),
  },

  {
    path: '/trips/:id/matches',
    element: (
      <DemoShell>
        <RequireDemoAuth allow={['DRIVER', 'OPERATOR']}>
          <TripMatches />
        </RequireDemoAuth>
      </DemoShell>
    ),
  },
])
