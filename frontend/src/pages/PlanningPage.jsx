import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api.js';
import Modal from '../components/Modal.jsx';

function currentMonthKey(){
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
}
function monthLabel(monthKey){
  const [y, m] = monthKey.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}
const PLANNING_OPTIONS = Array.from({ length: 21 }, (_, i) => i); // 0..20

export default function PlanningPage(){
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [department] = useState(() => localStorage.getItem('bom_department') || '');

  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [modal, setModal] = useState(null);
  const [uploadMonth, setUploadMonth] = useState(currentMonthKey());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [masterList, setMasterList] = useState([]); // [{ brand, models: [...] }]
  const [brandPicker, setBrandPicker] = useState(null); // { model, brands: [...] } when a model exists under multiple brands

  useEffect(() => { loadMonths(); loadMaster(); }, []);
  useEffect(() => { if(selectedMonth) loadSummary(); }, [selectedMonth]);

  async function loadMonths(){
    const { data } = await api.get('/planning/months', { params: { department } });
    setMonths(data);
  }
  async function loadMaster(){
    const { data } = await api.get('/master');
    setMasterList(data);
  }
  async function loadSummary(){
    const { data } = await api.get('/planning/summary', { params: { department, monthKey: selectedMonth } });
    setRows(data.rows);
    setFileName(data.fileName);
  }

  function notify(title, message){
    return new Promise(resolve => {
      setModal({
        title, message, showInput: false, confirmText: 'OK', showCancel: false,
        onConfirm: () => { setModal(null); resolve(); }
      });
    });
  }
  function askConfirm(title, message){
    return new Promise(resolve => {
      setModal({
        title, message, showInput: false, confirmText: 'Delete', showCancel: true,
        onConfirm: () => { setModal(null); resolve(true); },
        onCancel: () => { setModal(null); resolve(false); }
      });
    });
  }

  function onAddPlanningClick(){
    fileInputRef.current.click();
  }
  function onFilePicked(e){
    const file = e.target.files[0];
    if(!file) return;
    setPendingFile(file);
    setUploadMonth(selectedMonth);
    setShowUploadModal(true);
    e.target.value = '';
  }
  async function confirmUpload(){
    if(!pendingFile || !uploadMonth) return;
    const form = new FormData();
    form.append('file', pendingFile);
    form.append('department', department);
    form.append('monthKey', uploadMonth);
    try{
      await api.post('/planning', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUploadModal(false);
      setPendingFile(null);
      await loadMonths();
      setSelectedMonth(uploadMonth);
    }catch(err){
      await notify('Could not save planning sheet', err.response?.data?.message || 'Please try again.');
    }
  }

  async function deletePlanning(){
    const ok = await askConfirm('Delete planning', `Delete the entire planning sheet for ${monthLabel(selectedMonth)}? This cannot be undone.`);
    if(!ok) return;
    await api.delete('/planning', { params: { department, monthKey: selectedMonth } });
    await loadMonths();
    await loadSummary();
  }

  async function updatePlanningCount(model, planningCount){
    await api.put('/planning/model', { department, monthKey: selectedMonth, model, planningCount });
    await loadSummary();
  }

  async function onRowClick(row, e){
    if(e.target.closest('select')) return; // don't navigate when interacting with the dropdown
    if(row.bomId){
      navigate(`/checklist/${row.bomId}`);
      return;
    }

    const matchingBrands = masterList.filter(b => b.models.includes(row.model)).map(b => b.brand);

    if(matchingBrands.length === 0){
      await notify('Model not found', `"${row.model}" is not in your Brand/Model list yet. Please add this brand and model first on the Brand/Model page, then come back and add its BOM.`);
      return;
    }
    if(matchingBrands.length === 1){
      navigate(`/verify?brand=${encodeURIComponent(matchingBrands[0])}&model=${encodeURIComponent(row.model)}`);
      return;
    }
    setBrandPicker({ model: row.model, brands: matchingBrands });
  }

  function chooseBrand(brand, model){
    setBrandPicker(null);
    navigate(`/verify?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`);
  }

  function logout(){
    localStorage.removeItem('bom_token');
    localStorage.removeItem('bom_department');
    navigate('/login');
  }

  return (
    <div className="screen-wrap">
      <div className="topbar wide">
        <div className="logo-badge"><span className="dot"></span> {department} BoM Check</div>
        <button className="back-btn" onClick={logout} style={{ padding: '6px 10px' }}>Logout</button>
      </div>

      <div className="card full">
        <h1 className="title">Monthly Planning</h1>
        <p className="sub">See how many models are planned, pending, and complete each month</p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Month</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 0, width: 'auto', padding: '12px 20px' }} onClick={onAddPlanningClick}>
            + Add Planning
          </button>
          {rows.length > 0 && (
            <button className="btn btn-ghost" style={{ width: 'auto', padding: '12px 20px' }} onClick={deletePlanning}>
              Delete Planning
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onFilePicked} />
        </div>

        {fileName && <p className="sub" style={{ marginTop: 10, textAlign: 'left' }}>Source: {fileName}</p>}

        <div className="table-wrap" style={{ marginTop: 18 }}>
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Planning</th>
                <th>Pending</th>
                <th>Complete</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.model} onClick={(e) => onRowClick(row, e)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{row.model}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <select
                      value={row.planning}
                      onChange={e => updatePlanningCount(row.model, Number(e.target.value))}
                      style={{ minWidth: 80, padding: '6px 10px', fontSize: 12.5 }}
                    >
                      {PLANNING_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td style={{ color: row.pending > 0 ? 'var(--accent)' : 'var(--muted)' }}>{row.pending}</td>
                  <td style={{ color: row.complete > 0 ? 'var(--ok)' : 'var(--muted)' }}>{row.complete}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="sub" style={{ padding: 16 }}>
              No planning uploaded for {monthLabel(selectedMonth)} yet. Tap "+ Add Planning" to upload the model list for this month.
            </p>
          )}
        </div>

        <div style={{ marginTop: 22, textAlign: 'center' }}>
          <Link to="/verify" style={{ color: 'var(--accent)', fontSize: 13 }}>Go to Brand / Model page &rarr;</Link>
        </div>

        <div className="footer-credit">Developed by Neeraj Yadav</div>
      </div>

      {modal && (
        <Modal
          open={true}
          title={modal.title}
          message={modal.message}
          showInput={modal.showInput}
          confirmText={modal.confirmText}
          showCancel={modal.showCancel}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
        />
      )}

      {showUploadModal && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: 380 }}>
            <h1 className="title" style={{ fontSize: 18 }}>Which month is this plan for?</h1>
            <p className="sub">{pendingFile?.name}</p>
            <label>Month</label>
            <input
              type="month"
              value={uploadMonth}
              onChange={e => setUploadMonth(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#e8edf7', border: '1px solid var(--glass-border)', color: '#111827', fontSize: 14 }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowUploadModal(false); setPendingFile(null); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, marginTop: 0 }} onClick={confirmUpload}>Save</button>
            </div>
          </div>
        </div>
      )}

      {brandPicker && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: 380 }}>
            <h1 className="title" style={{ fontSize: 18 }}>Which brand?</h1>
            <p className="sub">"{brandPicker.model}" exists under more than one brand — pick which one you mean</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {brandPicker.brands.map(brand => (
                <button
                  key={brand}
                  className="btn btn-ghost"
                  style={{ marginTop: 0 }}
                  onClick={() => chooseBrand(brand, brandPicker.model)}
                >
                  {brand}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 14, width: '100%' }} onClick={() => setBrandPicker(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
