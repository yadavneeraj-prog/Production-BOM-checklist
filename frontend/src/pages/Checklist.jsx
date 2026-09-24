import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api.js';

const DEFAULT_FIELDS = { reading: false, status: true, remark: false };

export default function Checklist(){
  const { bomId } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [checks, setChecks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [readings, setReadings] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => { load(); }, [bomId]);

  async function load(){
    const { data } = await api.get(`/boms/one/${bomId}`);
    setEntry(data);
    initState(data);
  }

  function initState(data){
    const c = {}, r = {}, rd = {};
    data.rows.forEach((_, idx) => { c[idx] = null; r[idx] = ''; rd[idx] = ''; });
    setChecks(c);
    setRemarks(r);
    setReadings(rd);
  }

  function setCheck(idx, value){ setChecks(prev => ({ ...prev, [idx]: value })); }
  function setRemark(idx, value){ setRemarks(prev => ({ ...prev, [idx]: value })); }
  function setReading(idx, value){ setReadings(prev => ({ ...prev, [idx]: value })); }

  const fields = entry?.checklistFields || DEFAULT_FIELDS;

  const total = Object.keys(checks).length;
  const doneCount = Object.values(checks).filter(v => v !== null).length;
  // If this BOM doesn't use the Status column at all, there's nothing to gate
  // completion on — submit is always allowed once at least one row exists.
  const allChecked = fields.status ? (total > 0 && doneCount === total) : total > 0;

  async function submit(){
    const statuses = entry.rows.map((_, idx) => checks[idx]);
    const remarksArr = entry.rows.map((_, idx) => remarks[idx] || '');
    const readingsArr = entry.rows.map((_, idx) => readings[idx] || '');
    const { data } = await api.post(`/boms/${bomId}/attempt`, { statuses, remarks: remarksArr, readings: readingsArr });
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
          <p className="sub">
            {entry.department} / {entry.brand} / {entry.model}
            {fields.status ? ` — ${result.okCount} OK, ${result.notOkCount} Not OK.` : '.'}
          </p>
          <div className="sub" style={{ fontWeight: 700 }}>
            {result.required === 0
              ? 'Attempt recorded for this month.'
              : (result.remaining === 0
                ? `All ${result.required} attempts completed this month. Counter resets next month.`
                : `Attempt ${result.done} of ${result.required} done \u00b7 ${result.remaining} remaining`)}
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
          <div>{entry.department} / <strong>{entry.brand} / {entry.model}</strong></div>
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
                    {fields.reading && <th>Reading</th>}
                    {fields.status && <th>Status</th>}
                    {fields.remark && <th>Remark</th>}
                  </tr>
                </thead>
                <tbody>
                  {entry.rows.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, i) => <td key={i}>{cell || '-'}</td>)}
                      {fields.reading && (
                        <td>
                          <input
                            type="text"
                            value={readings[idx] || ''}
                            onChange={e => setReading(idx, e.target.value)}
                            placeholder="Enter reading"
                            style={{ minWidth: 120, padding: '6px 10px', fontSize: 12.5 }}
                          />
                        </td>
                      )}
                      {fields.status && (
                        <td>
                          <div className="toggle-group">
                            <button className={`toggle-btn ok ${checks[idx] === 'ok' ? 'active' : ''}`} onClick={() => setCheck(idx, 'ok')}>OK</button>
                            <button className={`toggle-btn notok ${checks[idx] === 'notok' ? 'active' : ''}`} onClick={() => setCheck(idx, 'notok')}>NOT OK</button>
                          </div>
                        </td>
                      )}
                      {fields.remark && (
                        <td>
                          <input
                            type="text"
                            value={remarks[idx] || ''}
                            onChange={e => setRemark(idx, e.target.value)}
                            placeholder="Optional remark"
                            style={{ minWidth: 160, padding: '6px 10px', fontSize: 12.5 }}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 24 }}>
              <button className="btn btn-primary" disabled={!allChecked} onClick={submit}>Submit Checklist</button>
              <p className="sub" style={{ marginTop: 8 }}>
                {fields.status
                  ? (allChecked ? 'All items checked — ready to submit' : 'Mark every item OK or Not OK to enable submit')
                  : 'Fill in the fields you need, then submit'}
              </p>
            </div>
          </>
        )}
        <div className="footer-credit">Developed By Neeraj Yadav</div>
      </div>
    </div>
  );
}
