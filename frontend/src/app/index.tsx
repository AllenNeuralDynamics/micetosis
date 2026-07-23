import { RouterProvider } from '@tanstack/react-router';

import { AppProvider } from '@/app/provider';
import { router } from '@/app/router';

function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}

export default App;
