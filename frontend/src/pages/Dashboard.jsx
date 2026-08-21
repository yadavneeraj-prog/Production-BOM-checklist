import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import Modal from '../components/Modal.jsx';

export default function Dashboard(){
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [masterList, setMasterList] = useState([]); // [{ brand, models: [...] }]
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [bomEntries, setBomEntries] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [openDots, setOpenDots] = useState(null); // entry id whose menu is open
  const [modal, setModal] = useState(null); // { title, message, showInput, inputDefault, confirmText, showCancel, onConfirm }

  useEffect(() => { loadMaster(); loadInProgress(); }, []);
  useEffect(() => { if(brand && model) loadBoms(); else setBomEntries([]); }, [brand, model]);

  async function loadMaster(){
    const { data } = await api.get('/master');
    setMasterList(data);
  }
  async function loadInProgress(){
    const { data } = await api.get('/boms/in-progress');
    setInProgress(data);
  }
  async function loadBoms(){
    const { data } = await api.get('/boms', { params: { brand, model } });
    setBomEntries(data);
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

  // ---- Brand master ----
  async function addBrand(){
    const name = await askText('New brand name');
    if(!name || !name.trim()) return;
    try{ await api.post('/master/brands', { brand: name.trim() }); await loadMaster(); setBrand(name.trim()); setModel(''); }
    catch(err){ await notify('Could not add brand', err.response?.data?.message || 'Try again'); }
  }
  async function editBrand(){
    if(!brand) return notify('Select a brand', 'Select a brand first.');
    const name = await askText('Rename brand', brand);
    if(!name || !name.trim() || name.trim() === brand) return;
    try{ await api.put(`/master/brands/${encodeURIComponent(brand)}`, { newBrand: name.trim() }); await loadMaster(); setBrand(name.trim()); }
    catch(err){ await notify('Could not rename brand', err.response?.data?.message || 'Try again'); }
  }
  async function deleteBrand(){
    if(!brand) return notify('Select a brand', 'Select a brand first.');
    const ok = await askConfirm('Delete brand', `Delete brand "${brand}" and all its models? This cannot be undone.`);
    if(!ok) return;
    await api.delete(`/master/brands/${encodeURIComponent(brand)}`);
    await loadMaster(); setBrand(''); setModel('');
  }

  // ---- Model master ----
  async function addModel(){
    if(!brand) return notify('Select a brand', 'Select a brand first.');
    const name = await askText('New model name');
    if(!name || !name.trim()) return;
    try{ await api.post(`/master/brands/${encodeURIComponent(brand)}/models`, { model: name.trim() }); await loadMaster(); setModel(name.trim()); }
    catch(err){ await notify('Could not add model', err.response?.data?.message || 'Try again'); }
  }
  async function editModel(){
    if(!brand || !model) return notify('Select a model', 'Select a brand and model first.');
    const name = await askText('Rename model', model);
    if(!name || !name.trim() || name.trim() === model) return;
    try{ await api.put(`/master/brands/${encodeURIComponent(brand)}/models/${encodeURIComponent(model)}`, { newModel: name.trim() }); await loadMaster(); setModel(name.trim()); }
    catch(err){ await notify('Could not rename model', err.response?.data?.message || 'Try again'); }
  }
  async function deleteModel(){
    if(!brand || !model) return notify('Select a model', 'Select a brand and model first.');
    const ok = await askConfirm('Delete model', `Delete model "${model}"? This cannot be undone.`);
    if(!ok) return;
    await api.delete(`/master/brands/${encodeURIComponent(brand)}/models/${encodeURIComponent(model)}`);
    await loadMaster(); setModel('');
  }

  // ---- BOM entries ----
  async function onFileChosen(e){
    const file = e.target.files[0];
    if(!file || !brand || !model) return;
    const form = new FormData();
    form.append('file', file);
    form.append('brand', brand);
    form.append('model', model);
    try{
      await api.post('/boms', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadBoms();
    }catch(err){
      await notify('Could not save BOM', err.response?.data?.message || 'Please try again.');
    }
    e.target.value = '';
  }

  async function editBomEntry(entry){
    const name = await askText('Edit BOM file name', entry.fileName);
    if(!name || !name.trim()) return;
    await api.put(`/boms/${entry._id}`, { fileName: name.trim() });
    await loadBoms();
  }
  async function deleteBomEntry(entry){
    const ok = await askConfirm('Delete BOM', 'Delete this BOM? This cannot be undone.');
    if(!ok) return;
    await api.delete(`/boms/${entry._id}`);
    await loadBoms();
  }
  async function exportEntryToExcel(entry){
    try{
      const res = await api.get(`/boms/${entry._id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entry.fileName.replace(/\.[^.]+$/, '')}_attempts.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }catch(err){
      await notify('No attempts yet', 'No attempts recorded yet for this BOM this month.');
    }
  }

  function openChecklist(entryId){ navigate(`/checklist/${entryId}`); }
  async function jumpToInProgress(id){ if(id) openChecklist(id); }

  function logout(){ localStorage.removeItem('bom_token'); navigate('/login'); }

  const models = masterList.find(b => b.brand === brand)?.models || [];

  return (
    <div className="screen-wrap">
      <div className="topbar wide">
        <div className="logo-badge"><span className="dot"></span> Production BoM Check</div>
        <button className="back-btn" onClick={logout} style={{ padding: '6px 10px' }}>Logout</button>
      </div>

      <div className="card wide">
        <h1 className="title">BOM Checklist</h1>
        <p className="sub">Select brand and model, then attach or open a BOM</p>

        {inProgress.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <label>This month's checklists in progress</label>
            <select onChange={e => jumpToInProgress(e.target.value)} value="">
              <option value="">Jump to a checklist you started this month</option>
              {inProgress.map(it => (
                <option key={it.id} value={it.id}>
                  {it.brand} / {it.model} — {it.label} — {it.done}/{it.required} done, {it.pending === 0 ? 'complete' : `${it.pending} pending`}
                </option>
              ))}
            </select>
          </div>
        )}

        <label>Brand</label>
        <div className="select-row" style={{ position: 'relative' }}>
          <select value={brand} onChange={e => { setBrand(e.target.value); setModel(''); }}>
            <option value="">Select brand</option>
            {masterList.map(b => <option key={b.brand} value={b.brand}>{b.brand}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <button className="dots-btn" onClick={() => setOpenDots(openDots === 'brand' ? null : 'brand')}>&#8942;</button>
            {openDots === 'brand' && (
              <div className="dots-menu">
                <button onClick={() => { setOpenDots(null); addBrand(); }}>Add</button>
                <button onClick={() => { setOpenDots(null); editBrand(); }}>Edit</button>
                <button className="danger" onClick={() => { setOpenDots(null); deleteBrand(); }}>Delete</button>
              </div>
            )}
          </div>
        </div>

        <label>Model</label>
        <div className="select-row" style={{ position: 'relative' }}>
          <select value={model} onChange={e => setModel(e.target.value)} disabled={!brand}>
            <option value="">{brand ? 'Select model' : 'Select brand first'}</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <button className="dots-btn" onClick={() => setOpenDots(openDots === 'model' ? null : 'model')}>&#8942;</button>
            {openDots === 'model' && (
              <div className="dots-menu">
                <button onClick={() => { setOpenDots(null); addModel(); }}>Add</button>
                <button onClick={() => { setOpenDots(null); editModel(); }}>Edit</button>
                <button className="danger" onClick={() => { setOpenDots(null); deleteModel(); }}>Delete</button>
              </div>
            )}
          </div>
        </div>

        {brand && model && (
          <div style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginTop: 22 }}>BOM files for this model</h2>
            <div className="add-bom-btn" onClick={() => fileInputRef.current.click()}
              style={{ marginTop: 12, padding: 14, borderRadius: 12, border: '1.5px dashed var(--glass-border)',
                background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0b0f1a' }}>+</div>
              Add BOM
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onFileChosen} />

            <div className="bom-list">
              {bomEntries.map(entry => {
                const remaining = Math.max(0, (entry.requiredAttempts || 0) - (entry.attempts?.length || 0));
                const chipText = entry.requiredAttempts == null
                  ? 'Open to set required checks per month'
                  : (remaining === 0 ? `All ${entry.requiredAttempts} attempts complete this month` : `${entry.attempts.length}/${entry.requiredAttempts} done \u00b7 ${remaining} pending`);
                return (
                  <div key={entry._id} className="bom-entry" onClick={(e) => { if(!e.target.closest('.dots-btn') && !e.target.closest('.dots-menu')) openChecklist(entry._id); }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{entry.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{entry.fileName}</div>
                      <div className={`attempts-chip ${remaining === 0 && entry.requiredAttempts != null ? 'done' : 'pending'}`}>{chipText}</div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button className="dots-btn" onClick={(e) => { e.stopPropagation(); setOpenDots(openDots === entry._id ? null : entry._id); }}>&#8942;</button>
                      {openDots === entry._id && (
                        <div className="dots-menu">
                          <button onClick={(e) => { e.stopPropagation(); setOpenDots(null); fileInputRef.current.click(); }}>Add</button>
                          <button onClick={(e) => { e.stopPropagation(); setOpenDots(null); editBomEntry(entry); }}>Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); setOpenDots(null); exportEntryToExcel(entry); }}>Export Excel</button>
                          <button className="danger" onClick={(e) => { e.stopPropagation(); setOpenDots(null); deleteBomEntry(entry); }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {bomEntries.length === 0 && <p className="sub" style={{ marginTop: 10 }}>No BOM added yet for this model. Tap "Add BOM" to upload one.</p>}
            </div>
          </div>
        )}

        <div className="footer-credit">Develop by Akshit Panwar</div>
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
