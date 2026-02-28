import React from 'react';
import ReactDOM from 'react-dom/client';
import { CalendarApp } from '@calendar/ui';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CalendarApp />
  </React.StrictMode>
);
