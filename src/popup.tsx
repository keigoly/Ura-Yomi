import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './components/Popup';
import './styles.css';

ReactDOM.createRoot(document.getElementById('popup-root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
