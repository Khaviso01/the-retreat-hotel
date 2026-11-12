import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

// This is the entry point of the React application. 
// It renders the App component into the root element of the HTML document.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);