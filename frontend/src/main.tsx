import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Remember a referral link (?ref=CODE) from any page; AuthContext applies it to the account at first sign-in.
try {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref) localStorage.setItem('signup_ref', ref.trim().toUpperCase());
} catch {
  /* storage blocked: the sign-up form's referral field still works */
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
