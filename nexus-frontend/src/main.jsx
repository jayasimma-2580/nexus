/**
 * main.jsx — App entry point
 *
 * Sets up:
 *   - React Query client with sensible defaults
 *   - Toast notifications (react-hot-toast) with theme-aware styling
 *   - App router
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

// Configure React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,                    // retry once on failure
      staleTime: 1000 * 60 * 2,   // cache for 2 minutes
      refetchOnWindowFocus: false, // don't refetch when tab is re-focused
    },
    mutations: {
      retry: 0, // never retry mutations automatically
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Global toast notifications — reads CSS vars for theming */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'custom-toast',
          duration: 4000,
          style: {
            background:  'var(--bg-card)',
            color:       'var(--text-primary)',
            border:      '1px solid var(--border)',
            boxShadow:   'var(--shadow-lg)',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: 'white' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
)
