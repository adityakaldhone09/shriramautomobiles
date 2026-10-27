import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@shriram/api-client';
import './i18n';
import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { API_BASE_URL } from './services/api/client';

import './index.css';

setBaseUrl(new URL(API_BASE_URL, window.location.origin).origin);

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
