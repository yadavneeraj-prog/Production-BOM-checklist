import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api.js';
import Modal from '../components/Modal.jsx';

export default function Login(){
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null); // { title, message }

  async function submit(e){
    e.preventDefault();
    setError('');
    try{
      if(isRegister){
        const { data } = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('bom_token', data.token);
      }else{
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('bom_token', data.token);
      }
      navigate('/');
    }catch(err){
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="screen-wrap">
      <div className="card">
        <div className="logo-mark">BC</div>
        <h1 className="title">Production BoM Check</h1>
        <p className="sub">{isRegister ? 'Create your account' : 'Sign in to continue'}</p>

        <form onSubmit={submit}>
          {isRegister && (
            <>
              <label>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </>
          )}
          <label>Email</label>
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} required />

          <label>Password</label>
          <div className="pw-wrap">
            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
            <span className="pw-toggle" onClick={() => setShowPw(s => !s)}>{showPw ? 'hide' : 'show'}</span>
          </div>

          {error && <p className="sub" style={{ color: 'var(--notok)', marginTop: 10 }}>{error}</p>}

          <button className="btn btn-primary" type="submit">{isRegister ? 'Create account' : 'Sign In'}</button>
        </form>

        <div className="foot-link-row">
          <Link to="/forgot-password">Forgot password?</Link>
          <a onClick={() => setIsRegister(r => !r)}>{isRegister ? 'Have an account? Sign in' : 'Create account'}</a>
        </div>
        <div className="footer-credit">Developed By Neeraj Yadav</div>
      </div>

      <Modal
        open={!!notice}
        title={notice?.title}
        message={notice?.message}
        showInput={false}
        showCancel={false}
        onConfirm={() => setNotice(null)}
      />
    </div>
  );
}
