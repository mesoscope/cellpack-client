import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LandingPage } from './routes'
import { PageRoutes } from './constants/routes'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import './index.css'
import App from './App.tsx'

const router = createBrowserRouter(
  [
    {
      path: PageRoutes.LANDING_PAGE,
      element: <LandingPage />,
    },
    {
      path: PageRoutes.PACKING_PAGE,
      element: <App/>,
    },
  ],
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
