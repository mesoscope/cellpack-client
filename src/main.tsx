import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LandingPage } from './routes'
import { PageRoutes } from './constants/routes'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import './index.css'
import App from './App.tsx'
import { decodeGitHubPagesUrl, isEncodedPathUrl, tryRemoveHashRouting } from "./utils/gh_routing";
import { ThemeRoot } from './style/themeRoot.tsx'

// Decode URL path if it was encoded for GitHub pages or uses hash routing.
const locationUrl = new URL(window.location.toString());
if (locationUrl.hash !== "" || isEncodedPathUrl(locationUrl)) {
  const decodedUrl = tryRemoveHashRouting(decodeGitHubPagesUrl(locationUrl));
  const newRelativePath = decodedUrl.pathname + decodedUrl.search + decodedUrl.hash;
  console.log("Redirecting to " + newRelativePath);
  // Replaces the query string path with the original path now that the
  // single-page app has loaded. This lets routing work as normal below.
  window.history.replaceState(null, "", newRelativePath);
}

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
  { basename: import.meta.env.BASE_URL }
);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeRoot>
            <RouterProvider router={router} />
        </ThemeRoot>
    </StrictMode>
);
