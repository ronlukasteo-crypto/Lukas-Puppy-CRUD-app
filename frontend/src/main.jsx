import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AsgardeoProvider } from '@asgardeo/react';
import './index.css';
import App from './App.js';

const baseUrl = import.meta.env.VITE_ASGARDEO_BASE_URL;
const clientId = import.meta.env.VITE_ASGARDEO_CLIENT_ID;
const afterSignInUrl = import.meta.env.VITE_ASGARDEO_SIGN_IN_REDIRECT_URL;
const afterSignOutUrl = import.meta.env.VITE_ASGARDEO_SIGN_OUT_REDIRECT_URL;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AsgardeoProvider
      baseUrl={baseUrl}
      clientId={clientId}
      afterSignInUrl={afterSignInUrl}
      afterSignOutUrl={afterSignOutUrl}
      scopes={['openid', 'profile']}
    >
      <App />
    </AsgardeoProvider>
  </StrictMode>
);
