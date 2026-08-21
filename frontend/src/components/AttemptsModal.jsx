import React, { useState } from 'react';

/* Shown the first time a BOM's checklist is opened: how many times per month
   it needs checking, and (optionally) who to email when all attempts are done. */
export default function AttemptsModal({ open, onConfirm, onCancel }){
  const [count, setCount] = useState(3);
  const [email, setEmail] = useState('');

  if(!open) return null;

  return (
    <div className="modal-overlay">
      <div className="card" style={{ maxWidth: 360 }}>
        <h1 className="title" style={{ fontSize: 18 }}>Set up checks for this BOM</h1>
        <p className="sub">How many times should this BOM be checked per month?</p>
        <label>Number of attempts</label>
        <select value={count} onChange={e => setCount(Number(e.target.value))}>
          {Array.from({ length: 13 }, (_, i) => i).map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <label>Notify email when complete (optional)</label>
        <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1, marginTop: 0 }} onClick={() => onConfirm({ count, email: email.trim() || null })}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
