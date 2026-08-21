import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import AttemptsModal from '../components/AttemptsModal.jsx';

export default function Checklist(){
  const { bomId } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [checks, setChecks] = useState({});
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const [result, setResult] = useState(null); // { done, required, remaining, okCount, notOkCount, attemptDate }

  useEffect(() => { load(); }, [bomId]);

  async function load(){
    const { data } = await api.get(`/boms/one/${bomId}`);
    setEntry(data);
    if(data.requiredAttempts == null) setShowAttemptsModal(true);
    else initChecks(data);
  }

  function initChecks(data){
    const c = {};
    data.rows.forEach((_, idx) => { c[idx] = null; });
    setChecks(c);
  }

  async function confirmAttempts({ count, email }){
    await api.put(`/boms/${bomId}/setup`, { requiredAttempts: count, notifyEmail: email });
    setShowAttemptsModal(false);
    await load();
  }

  function setCheck(idx, value){
    setChecks(prev => ({ ...prev, [idx]: value }));
  }

  const total = Object.keys(checks).length;
  const done = Object.values(checks).filter(v => v !== null).length;
  const allChecked = total > 0 && done === total;

  async function submit(){
    const statuses = entry.rows.map((_, idx) => checks[idx]);
    const { data } = await api.post(`/boms/${bomId}/attempt`, { statuses });
    const okCount = statuses.filter(s => s === 'ok').length;
    const notOkCount = statuses.filter(s => s === 'notok').length;
    setResult({ ...data, okCount, notOkCount });
    setEntry(data.entry);
  }

  async function exportExcel(){
    const res = await api.get(`/boms/${bomId}/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.fileName.replace(/\.[^.]+$/, '')}_attempts.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if(!entry) return <div className="screen-wrap"><p className="sub">Loading...</p></div>;

  if(result){
    return (
      <div className="screen-wrap">
        <div className="card center-text">
          <div className="logo-mark" style={{ margin: '0 auto 10px' }}>BC</div>
          <div className="success-icon">&#10003;</div>
          <h1 className="title">Checklist submitted</h1>
          <p className="sub">{entry.brand} / {entry.model} — {result.okCount} OK, {result.notOkCount} Not OK.</p>
          <div className="sub" style={{ fontWeight: 700 }}>
            {result.remaining === 0
              ? `All ${result.required} attempts completed this month. Counter resets next month.`
              : `Attempt ${result.done} of ${result.required} done \u00b7 ${result.remaining} remaining`}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to BOM list</button>
            <button className="btn btn-ghost" onClick={exportExcel}>Export Excel</button>
          </div>
          <div className="footer-credit">Develop by Akshit Panwar</div>
        </div>
      </div>
    );
  }

  const monthDone = entry.monthDone ?? 0;
  const isComplete = entry.requiredAttempts != null && monthDone >= entry.requiredAttempts;

  return (
    <div className="screen-wrap">
      <div className="back-row wide">
        <button className="back-btn" onClick={() => navigate('/')}>&larr; Back</button>
      </div>
      <div className="card full">
        <h1 className="title">Checklist</h1>
        <div className="bom-meta">
          <div>File: <strong>{entry.label} ({entry.fileName})</strong></div>
          <div>Brand/Model: <strong>{entry.brand} / {entry.model}</strong></div>
        </div>

        {entry.requiredAttempts != null && (
          <div className="attempt-banner">
            {isComplete
              ? `All ${entry.requiredAttempts} attempts completed for this BOM this month.`
              : `Attempt ${monthDone + 1} of ${entry.requiredAttempts} this month`}
          </div>
        )}

        {isComplete ? (
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={exportExcel}>Export Excel (all attempts)</button>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {entry.headers.map(h => <th key={h}>{h}</th>)}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.rows.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, i) => <td key={i}>{cell || '-'}</td>)}
                      <td>
                        <div className="toggle-group">
                          <button className={`toggle-btn ok ${checks[idx] === 'ok' ? 'active' : ''}`} onClick={() => setCheck(idx, 'ok')}>OK</button>
                          <button className={`toggle-btn notok ${checks[idx] === 'notok' ? 'active' : ''}`} onClick={() => setCheck(idx, 'notok')}>NOT OK</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 24 }}>
              <button className="btn btn-primary" disabled={!allChecked} onClick={submit}>Submit Checklist</button>
              <p className="sub" style={{ marginTop: 8 }}>
                {allChecked ? 'All items checked — ready to submit' : 'Mark every item OK or Not OK to enable submit'}
              </p>
            </div>
          </>
        )}
        <div className="footer-credit">Develop by Akshit Panwar</div>
      </div>

      <AttemptsModal open={showAttemptsModal} onConfirm={confirmAttempts} onCancel={() => navigate('/')} />
    </div>
  );
}
