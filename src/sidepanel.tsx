import React from 'react';
import ReactDOM from 'react-dom/client';
import SidePanel from './components/SidePanel';
import './styles.css';

ReactDOM.createRoot(document.getElementById('sidepanel-root')!).render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>
);
