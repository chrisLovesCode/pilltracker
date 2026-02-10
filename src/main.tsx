import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/i18n'; // Initialize i18n
import { initDb, isNativePlatform } from './db';
import App from './App.tsx';

// Browser check: DB only works on native platforms
if (!isNativePlatform()) {
  console.warn('[Main] ⚠️ Running in browser - database not available');
  console.warn('[Main] Please build and run on native platform: npm run build && npx cap sync && npx cap open android');
  
  // Render app without DB initialization
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  // Native platform: Initialize DB first
  console.log('[Main] Initializing database...');
  initDb()
    .then(() => {
      console.log('[Main] ✅ Database initialized successfully');
      
      createRoot(document.getElementById('root')!).render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    })
    .catch((error) => {
      console.error('[Main] ❌ Failed to initialize database:', error);
      
      // Show error to user
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = `
          <div style="padding: 20px; text-align: center; font-family: sans-serif;">
            <h1 style="color: red;">❌ Database Initialization Failed</h1>
            <p style="font-size: 16px; margin: 20px 0;">${error.message}</p>
            <p style="color: #666; font-size: 14px;">Please check the console for more details.</p>
          </div>
        `;
      }
    });
}

