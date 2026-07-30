import React from 'react';
import ReactDOM from 'react-dom/client';
import { CalendarAppWithSidebar } from '@calendar/ui';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CalendarAppWithSidebar />
  </React.StrictMode>
);
