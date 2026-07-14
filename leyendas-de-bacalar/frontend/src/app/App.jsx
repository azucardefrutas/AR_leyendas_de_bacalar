import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { SavedProvider } from '../context/SavedContext.jsx';
import SystemBanner from '../components/ui/SystemBanner.jsx';

function App() {
  return (
    <SavedProvider>
      <SystemBanner />
      <RouterProvider router={router} />
    </SavedProvider>
  );
}

export default App;
