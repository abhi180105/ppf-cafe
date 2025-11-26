// src/router.jsx
// React Router v7 setup (declarative mode)
// Currently using single-page app structure
// This file is prepared for future multi-page routing if needed

import { createBrowserRouter } from 'react-router-dom';
import App from './App';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <h1>404 - Page Not Found</h1>
      <a href="/" style={{ color: '#007bff', textDecoration: 'none' }}>Go Home</a>
    </div>
  }
]);

export default router;