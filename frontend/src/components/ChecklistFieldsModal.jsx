import React, { useEffect, useState } from 'react';

/* Shown right after a BOM is saved (and reopenable via "Edit Fields" later):
   pick which checklist columns this BOM actually needs. Any combination is
   valid — Reading only, Status only, all three, etc. Each is a simple toggle
   ("+" when off, checked/highlighted when on). */
export default function ChecklistFieldsModal({ open, initial, onConfirm, onCancel }){
  const [reading, setReading] = useState(false);
  const [status, setStatus] = useState(true);
  const [remark, setRemark] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if(open){
      setReading(!!initial?.reading);
      setStatus(!!initial?.status);
      setRemark(!!initial?.remark);
      setError('');
    }
  }, [open, initial]);

  if(!open) return null;

  function toggle(setter, val){ setError(''); setter(!val); }

  function confirm(){
    if(!reading && !status && !remark){
      setError('Select at least one field for this checklist.');
      return;
    }
    onConfirm({ reading, status, remark });
  }

  const fieldBtn = (label, on, onClick) => (
    <button
      type="button"
      onClick={onClick}
      className="btn"
      style={{
        flex: 1, justifyContent: 'space-between', padding: '12px 16px',
        background: on ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${on ? 'var(--accent)' : 'var(--glass-border)'}`,
        color: on ? 'var(--accent)' : 'var(--text)', fontWeight: 700, marginTop: 0
      }}
    >
      {label} <span style={{ fontSize: 16 }}>{on ? '\u2713' : '+'}</span>
    </button>
  );

  return (
    <div className="modal-overlay">
      <div className="card" style={{ maxWidth: 380 }}>
        <h1 className="title" style={{ fontSize: 18 }}>Checklist fields for this BOM</h1>
        <p className="sub">Pick whichever this BOM needs — any combination is fine</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {fieldBtn('Reading', reading, () => toggle(setReading, reading))}
          {fieldBtn('OK / NOT OK', status, () => toggle(setStatus, status))}
          {fieldBtn('Remark', remark, () => toggle(setRemark, remark))}
        </div>

        {error && <p className="sub" style={{ color: 'var(--notok)', marginTop: 10 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1, marginTop: 0 }} onClick={confirm}>Save</button>
        </div>
      </div>
    </div>
  );
}
