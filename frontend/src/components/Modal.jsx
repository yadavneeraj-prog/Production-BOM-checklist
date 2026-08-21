import React, { useEffect, useRef, useState } from 'react';

/* Generic modal used for text-input prompts and confirm/notify dialogs,
   replacing window.prompt/confirm/alert (unreliable inside embedded views). */
export default function Modal({ open, title, message, showInput, inputDefault = '', confirmText = 'OK', showCancel = true, onConfirm, onCancel }){
  const [value, setValue] = useState(inputDefault);
  const inputRef = useRef(null);

  useEffect(() => {
    if(open){ setValue(inputDefault); setTimeout(() => inputRef.current && inputRef.current.focus(), 50); }
  }, [open, inputDefault]);

  if(!open) return null;

  return (
    <div className="modal-overlay">
      <div className="card" style={{ maxWidth: 380 }}>
        <h1 className="title" style={{ fontSize: 18 }}>{title}</h1>
        {message && <p className="sub">{message}</p>}
        {showInput && (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter') onConfirm(value); }}
          />
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {showCancel && (
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          )}
          <button className="btn btn-primary" style={{ flex: 1, marginTop: 0 }} onClick={() => onConfirm(showInput ? value : true)}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
