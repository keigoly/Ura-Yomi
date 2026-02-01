import React from 'react';
import ReactDOM from 'react-dom/client';
import Settings from './components/Settings';
import './styles.css';

ReactDOM.createRoot(document.getElementById('settings-root')!).render(
  <React.StrictMode>
    <Settings />
  </React.StrictMode>
);
