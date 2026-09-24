import React, { useEffect, useState } from 'react';
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
  const [modal, setModal] = useState(null); // generic modal state (add/edit/delete/notify)

  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('');
  const [openDots, setOpenDots] = useState(false);

  useEffect(() => { if(isRegister) loadDepartments(); }, [isRegister]);

  async function loadDepartments(){
    const { data } = await api.get('/departments');
    setDepartments(data);
    if(data.length && !department) setDepartment(data.includes('Production') ? 'Production' : data[0]);
  }

  function closeModal(){ setModal(null); }
  function askText(title, inputDefault = ''){
    return new Promise(resolve => {
      setModal({
        title, showInput: true, inputDefault, confirmText: 'Save', showCancel: true,
        onConfirm: (val) => { closeModal(); resolve(val); },
        onCancel: () => { closeModal(); resolve(null); }
      });
    });
  }
  function askConfirm(title, message){
    return new Promise(resolve => {
      setModal({
        title, message, showInput: false, confirmText: 'Delete', showCancel: true,
        onConfirm: () => { closeModal(); resolve(true); },
        onCancel: () => { closeModal(); resolve(false); }
      });
    });
  }
  function notify(title, message){
    return new Promise(resolve => {
      setModal({
        title, message, showInput: false, confirmText: 'OK', showCancel: false,
        onConfirm: () => { closeModal(); resolve(); }
      });
    });
  }

  // ---- Department master (available right here at signup) ----
  async function addDepartment(){
    const name = await askText('New department name');
    if(!name || !name.trim()) return;
    try{
      await api.post('/departments', { name: name.trim() });
      await loadDepartments();
      setDepartment(name.trim());
    }catch(err){ await notify('Could not add department', err.response?.data?.message || 'Try again'); }
  }
  async function editDepartment(){
    if(!department) return notify('Select a department', 'Select a department first.');
    const name = await askText('Rename department', department);
    if(!name || !name.trim() || name.trim() === department) return;
    try{
      await api.put(`/departments/${encodeURIComponent(department)}`, { newName: name.trim() });
      await loadDepartments();
      setDepartment(name.trim());
    }catch(err){ await notify('Could not rename department', err.response?.data?.message || 'Try again'); }
  }
  async function deleteDepartment(){
    if(!department) return notify('Select a department', 'Select a department first.');
    const ok = await askConfirm('Delete department', `Delete department "${department}"? This cannot be undone.`);
    if(!ok) return;
    try{
      await api.delete(`/departments/${encodeURIComponent(department)}`);
      await loadDepartments();
      setDepartment('');
    }catch(err){ await notify('Could not delete department', err.response?.data?.message || 'Try again'); }
  }

  async function submit(e){
    e.preventDefault();
    setError('');
    try{
      if(isRegister){
        if(!department){ setError('Select a department'); return; }
        await api.post('/auth/register', { name, email, password, department });
        // Account created — go back to the sign-in form instead of auto-logging in.
        setIsRegister(false);
        setPassword('');
        setError('');
        await notify('Account created', 'Your account has been created. Please sign in.');
        return;
      }
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('bom_token', data.token);
      localStorage.setItem('bom_department', data.user.department);
      navigate('/');
    }catch(err){
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="screen-wrap">
      <div className="card">
        <div className="logo-mark">BC</div>
        <h1 className="title">{isRegister && department ? `${department} BOM Verify` : 'BOM Verify'}</h1>
        <p className="sub">{isRegister ? 'Create your account' : 'Sign in to continue'}</p>

        <form onSubmit={submit}>  
          {isRegister && (
            <>
              <label>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required />

              <label>Department</label>
              <div className="select-row" style={{ position: 'relative' }}>
                <select value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div style={{ position: 'relative' }}>
                  <button type="button" className="dots-btn" onClick={() => setOpenDots(o => !o)}>&#8942;</button>
                  {openDots && (
                    <div className="dots-menu">
                      <button type="button" onClick={() => { setOpenDots(false); addDepartment(); }}>Add</button>
                      <button type="button" onClick={() => { setOpenDots(false); editDepartment(); }}>Edit</button>
                      <button type="button" className="danger" onClick={() => { setOpenDots(false); deleteDepartment(); }}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
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
        <div className="footer-credit">Developed by Neeraj Yadav</div>
      </div>

      {modal && (
        <Modal
          open={true}
          title={modal.title}
          message={modal.message}
          showInput={modal.showInput}
          inputDefault={modal.inputDefault}
          confirmText={modal.confirmText}
          showCancel={modal.showCancel}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
        />
      )}
    </div>
  );
}
