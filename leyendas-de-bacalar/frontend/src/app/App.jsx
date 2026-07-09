import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { SavedProvider } from '../context/SavedContext.jsx';

function App() {
  return (
    <SavedProvider>
      <RouterProvider router={router} />
    </SavedProvider>
  );
}

export default App;
