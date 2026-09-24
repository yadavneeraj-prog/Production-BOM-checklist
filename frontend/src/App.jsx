import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PlanningPage from './pages/PlanningPage.jsx';
import Checklist from './pages/Checklist.jsx';

function ProtectedRoute({ children }){
  const token = localStorage.getItem('bom_token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App(){
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/" element={<ProtectedRoute><PlanningPage /></ProtectedRoute>} />
      <Route path="/verify" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/checklist/:bomId" element={<ProtectedRoute><Checklist /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
