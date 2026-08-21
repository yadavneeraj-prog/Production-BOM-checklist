import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';

export default function ForgotPassword(){
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = request OTP, 2 = enter OTP + new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');

  async function requestOtp(e){
    e.preventDefault();
    setStatus('');
    try{
      await api.post('/auth/forgot-password', { email });
      setStatus('If this email is registered, an OTP has been sent.');
      setStep(2);
    }catch(err){
      setStatus(err.response?.data?.message || 'Could not process request');
    }
  }

  async function resetPassword(e){
    e.preventDefault();
    setStatus('');
    try{
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setStatus('Password reset successfully. Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1500);
    }catch(err){
      setStatus(err.response?.data?.message || 'Could not reset password');
    }
  }

  return (
    <div className="screen-wrap">
      <div className="back-row">
        <button className="back-btn" onClick={() => navigate('/login')}>&larr; Back</button>
      </div>
      <div className="card">
        <div className="logo-mark">BC</div>
        <h1 className="title">Reset password</h1>
        <p className="sub">
          {step === 1 ? "Enter your registered email — we'll send an OTP" : 'Enter the OTP and your new password'}
        </p>

        {step === 1 ? (
          <form onSubmit={requestOtp}>
            <label>Email</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} required />
            <button className="btn btn-primary" type="submit">Send OTP</button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <label>OTP</label>
            <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required />
            <label>New password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            <button className="btn btn-primary" type="submit">Reset password</button>
          </form>
        )}

        {status && <p className="sub" style={{ marginTop: 14 }}>{status}</p>}
        <div className="footer-credit">Develop by Akshit Panwar</div>
      </div>
    </div>
  );
}
