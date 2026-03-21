import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import App from './App.jsx';
import SignUp from './Components/SignUp.jsx';
import Analyze from './Components/Analyze.jsx';
import Profile from './Components/Profile.jsx';
import SignIn from './Components/SignIn.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />

        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="/SignUp" element={<Navigate to="/signup" replace />} />
        <Route path="/SignIn" element={<Navigate to="/signin" replace />} />
        <Route path="/Analyze" element={<Navigate to="/analyze" replace />} />
        <Route path="/Profile" element={<Navigate to="/profile" replace />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
