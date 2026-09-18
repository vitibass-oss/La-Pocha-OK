import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { performSafeBoot } from './utils/safeBoot.ts';
import './index.css';

/**
 * Safe App Bootstrap
 * Performs preliminary integrity auditing on localStorage and Service Worker
 * before mounting the React root, preventing unhandled offline white-screen freezes.
 */
function bootstrapApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Fatal: #root element not found in DOM');
    return;
  }

  try {
    // 1. Validate & sanitize stored game state and history safely
    try {
      const bootReport = performSafeBoot();
      if (bootReport.errors.length > 0) {
        console.warn('SafeBoot Notice:', bootReport.errors.join(' | '));
      }
    } catch (safeBootErr) {
      console.warn('Non-blocking safeBoot warning:', safeBootErr);
    }

    // 2. Mount React application within Error Boundary
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (criticalBootError) {
    console.error('Critical boot error caught during initialization:', criticalBootError);

    // Bulletproof Fallback UI directly in DOM if React root fails completely
    rootElement.innerHTML = `
      <div style="min-height: 100vh; background-color: #020617; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px;">
        <div style="width: 64px; height: 64px; border-radius: 20px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 28px;">
          ⚠️
        </div>
        <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 8px 0;">Error al iniciar la aplicación</h1>
        <p style="font-size: 13px; color: #94a3b8; max-width: 360px; line-height: 1.5; margin: 0 0 24px 0;">
          Se detectó un estado inconsistente al reanudar en modo offline. Pulsa el botón para restaurar la aplicación de forma segura.
        </p>
        <button id="safe-boot-recovery-btn" style="background: linear-gradient(to right, #f59e0b, #eab308); color: #020617; font-weight: 800; font-size: 13px; padding: 12px 24px; border-radius: 12px; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(245,158,11,0.3);">
          Reiniciar y Restaurar
        </button>
      </div>
    `;

    const recoveryBtn = document.getElementById('safe-boot-recovery-btn');
    if (recoveryBtn) {
      recoveryBtn.addEventListener('click', () => {
        try {
          localStorage.clear();
          if ('caches' in window) {
            caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
          }
        } catch (_) {}
        window.location.reload();
      });
    }
  }
}

// Execute safe bootstrap
bootstrapApp();
