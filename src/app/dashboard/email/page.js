'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Send, Users, User, CheckCircle, AlertCircle, FileText, Calendar, Paperclip, X, Inbox, RefreshCw, MapPin } from 'lucide-react';

const EMAIL_TYPES = [
  { value: 'general', label: 'General', icon: null },
  { value: 'document', label: 'Document Announcement', icon: 'file' },
  { value: 'holiday', label: 'Holiday Announcement', icon: 'calendar' },
  { value: 'location', label: 'GPS Location Share', icon: 'location' },
];

export default function EmailBlastPage() {
  const [tab, setTab] = useState('compose'); // compose | records
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [senderEmail, setSenderEmail] = useState('contact@cecubeindia.com');
  const [senderName, setSenderName] = useState('Cecube HR');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('all');
  const [emailType, setEmailType] = useState('general');
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [docNote, setDocNote] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [selectedHoliday, setSelectedHoliday] = useState('');
  const [holidayNote, setHolidayNote] = useState('');
  const [emailLogs, setEmailLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const fileInputRef = useRef(null);

  const loadEmailLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/email');
      const data = await res.json();
      setEmailLogs(Array.isArray(data) ? data : []);
    } catch {
      setEmailLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEmployees(data);
    });
    fetch('/api/leaves/holidays').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setHolidays(data);
    });
    fetch('/api/locations').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setLocations(data);
    });

    try {
      const admin = JSON.parse(sessionStorage.getItem('adminData') || '{}');
      if (admin.email) {
        const normalized = String(admin.email).toLowerCase();
        if (normalized.includes('hr') || normalized.includes('cecube')) {
          setSenderEmail(normalized);
          setSenderName(admin.name || 'Cecube HR');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (tab === 'records') loadEmailLogs();
  }, [tab, loadEmailLogs]);

  const toggleEmployee = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(',')[1];
      setDocFile({ filename: file.name, data: base64, contentType: file.type, size: file.size });
    };
    reader.readAsDataURL(file);
  };

  const buildSubjectAndMessage = () => {
    if (emailType === 'document') {
      const sub = '[Document] ' + (docName || 'New Document') + ' - ' + docType;
      const msg = 'Dear Team,\n\nWe are sharing the following document for your reference:\n\nDocument: ' + (docName || '') + '\nType: ' + docType + (docFile ? '\nAttachment: ' + docFile.filename : '') + (docNote ? '\n\n' + docNote : '') + '\n\nPlease review it at your earliest convenience.\n\nBest regards,\nCecube HR Team';
      return { sub, msg };
    }
    if (emailType === 'holiday') {
      const holiday = holidays.find(h => String(h.id) === String(selectedHoliday));
      const dateStr = holiday ? new Date(holiday.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const sub = 'Holiday Notice: ' + (holiday ? holiday.name : 'Upcoming Holiday');
      const msg = 'Dear Team,\n\nThis is to inform you that the following holiday is coming up:\n\nHoliday: ' + (holiday ? holiday.name : '') + '\nDate: ' + dateStr + (holidayNote ? '\n\n' + holidayNote : '') + '\n\nPlease plan your work accordingly.\n\nBest regards,\nCecube HR Team';
      return { sub, msg };
    }
    if (emailType === 'location') {
      const location = locations.find(l => String(l.id) === String(locationId));
      if (!location) {
        return { sub: subject, msg: message };
      }
      const mapLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      const sub = '[Location] ' + location.name;
      const msg = 'Dear Team,\n\nPlease find the GPS location below:\n\nLocation: ' + location.name + '\nType: ' + (location.locationType || 'GPS Location') + '\nAddress: ' + (location.address || 'Not provided') + '\nCoordinates: ' + location.latitude + ', ' + location.longitude + '\nMap: ' + mapLink + (locationNote ? '\n\n' + locationNote : '') + '\n\nPlease use this location as needed.\n\nBest regards,\nCecube HR Team';
      return { sub, msg };
    }
    return { sub: subject, msg: message };
  };

  const handleSend = async (e) => {
    e.preventDefault();
    let finalSubject = subject;
    let finalMessage = message;
    if (emailType !== 'general') {
      const built = buildSubjectAndMessage();
      finalSubject = built.sub;
      finalMessage = built.msg;
    }
    if (!finalSubject.trim() || !finalMessage.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const body = {
        subject: finalSubject,
        message: finalMessage,
        emailType,
        senderEmail,
        senderName
      };
      if (mode === 'select' && selected.length > 0) body.recipientIds = selected;
      if (emailType === 'document') {
        body.documentName = docName;
        body.documentTypeLabel = docType;
        body.attachment = docFile;
      }
      try {
        const admin = JSON.parse(sessionStorage.getItem('adminData') || '{}');
        if (admin.email) body.sentBy = admin.email;
      } catch { /* ignore */ }

      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: 'success', text: 'Email sent to ' + data.sent + ' employee' + (data.sent !== 1 ? 's' : '') + ' successfully!' });
        setSubject(''); setMessage(''); setSelected([]);
        setDocName(''); setDocType(''); setDocNote(''); setDocFile(null);
        setLocationId(''); setLocationNote('');
        setSelectedHoliday(''); setHolidayNote('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadEmailLogs();
      } else {
        setResult({ type: 'error', text: data.error || 'Failed to send email' });
      }
    } catch (err) {
      setResult({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const recipientCount = mode === 'all' ? employees.length : selected.length;

  const isSendDisabled = () => {
    if (sending) return true;
    if (mode === 'select' && selected.length === 0) return true;
    if (emailType === 'document' && (!docName.trim() || !docType.trim())) return true;
    if (emailType === 'holiday' && !selectedHoliday) return true;
    if (emailType === 'location' && !locationId) return true;
    if (emailType === 'general' && (!subject.trim() || !message.trim())) return true;
    return false;
  };

  const preview = emailType === 'document' && docName ? buildSubjectAndMessage()
    : emailType === 'holiday' && selectedHoliday ? buildSubjectAndMessage()
    : emailType === 'location' && locationId ? buildSubjectAndMessage()
    : emailType === 'general' ? buildSubjectAndMessage()
    : null;
  const formatSize = (bytes) => bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB';

  const viewSharedDocument = async (log) => {
    try {
      const res = await fetch(`/api/email/attachment?id=${log.id}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error || 'Unable to fetch shared document');
        return;
      }
      const binaryString = atob(data.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.fileType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error(err);
      alert('Unable to open shared document');
    }
  };

  const tabBtn = (id, label, icon) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', border: 'none', borderBottom: tab === id ? '2px solid #6366f1' : '2px solid transparent',
        background: 'none', color: tab === id ? '#4f46e5' : '#6b7280', fontWeight: tab === id ? 700 : 500,
        cursor: 'pointer', fontSize: '0.9rem'
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <Mail size={28} color="#6366f1" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Email Blast</h1>
      </div>
      <p style={{ color: '#64748b', marginBottom: '1.25rem', marginTop: '4px' }}>
        Send an email to all or selected employees from your chosen sender address.
      </p>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {tabBtn('compose', 'Compose', <Send size={14} />)}
        {tabBtn('records', 'Sent Emails', <Inbox size={14} />)}
      </div>

      {tab === 'records' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Email Records</h2>
            <button type="button" onClick={loadEmailLogs} disabled={logsLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              <RefreshCw size={14} style={{ animation: logsLoading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

          {logsLoading && emailLogs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading email records...</div>
          ) : emailLogs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12 }}>
              No emails sent yet. Compose and send from the Compose tab.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {emailLogs.map(log => (
                <div key={log.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '1rem 1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>{log.subject}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            {new Date(log.createdAt).toLocaleString('en-IN')} · {log.recipientCount} recipient{log.recipientCount !== 1 ? 's' : ''}
                            {log.attachmentName ? ` · 📎 ${log.attachmentName}` : ''}
                            {log.sentBy ? ` · from ${log.sentBy}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#ede9fe', color: '#5b21b6', textTransform: 'capitalize' }}>
                            {log.emailType || 'general'}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                            background: log.status === 'SENT' ? '#dcfce7' : '#fee2e2',
                            color: log.status === 'SENT' ? '#166534' : '#991b1b'
                          }}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Delete this email log?')) return;
                        try {
                          const res = await fetch(`/api/email?id=${log.id}`, { method: 'DELETE' });
                          const deleted = await res.json();
                          if (deleted.success) {
                            setExpandedLog(null);
                            loadEmailLogs();
                          } else {
                            alert(deleted.error || 'Failed to delete email log');
                          }
                        } catch (err) {
                          alert('Failed to delete email log');
                        }
                      }}
                      style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#e11d48', fontWeight: 600, fontSize: '12px' }}>
                      Delete
                    </button>
                  </div>
                  {expandedLog === log.id && (
                    <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ marginTop: 12, marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Message</div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        {log.message}
                      </pre>
                      {log.attachmentName && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#334155' }}>
                          <Paperclip size={14} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                {log.emailType === 'document' ? 'Document' : 'Attachment'}
                              </div>
                              <div>{log.attachmentName}</div>
                            </div>
                            {log.emailType === 'document' && (
                              <button type="button" onClick={() => viewSharedDocument(log)}
                                style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#3b82f6', fontSize: 12, fontWeight: 700 }}>
                                View shared document
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {log.recipientNames && (
                        <>
                          <div style={{ marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Recipients</div>
                          <div style={{ fontSize: 13, color: '#475569' }}>{log.recipientNames}</div>
                        </>
                      )}
                      {log.recipientEmails && (
                        <>
                          <div style={{ marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Emails</div>
                          <div style={{ fontSize: 12, color: '#64748b', wordBreak: 'break-all' }}>{log.recipientEmails}</div>
                        </>
                      )}
                      {log.errorMessage && (
                        <div style={{ marginTop: 12, fontSize: 13, color: '#dc2626' }}>Error: {log.errorMessage}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'compose' && (
        <>
      {result && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderRadius: 10, marginBottom: '1.5rem', background: result.type === 'success' ? '#f0fdf4' : '#fef2f2', border: '1px solid ' + (result.type === 'success' ? '#bbf7d0' : '#fecaca'), color: result.type === 'success' ? '#15803d' : '#dc2626' }}>
          {result.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontWeight: 600 }}>{result.text}</span>
        </div>
      )}

      <form onSubmit={handleSend}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: '0.75rem', fontSize: '0.875rem' }}>Email Type</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {EMAIL_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setEmailType(t.value)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '2px solid ' + (emailType === t.value ? '#6366f1' : '#e2e8f0'), background: emailType === t.value ? '#ede9fe' : '#fff', color: emailType === t.value ? '#4f46e5' : '#6b7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                {t.icon === 'file' && <FileText size={14} />}
                {t.icon === 'calendar' && <Calendar size={14} />}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {emailType === 'document' && (
          <div style={{ background: '#fafaf9', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
              <FileText size={15} color="#6366f1" /> Document Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.8rem' }}>Document Name *</label>
                <input type="text" value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Leave Policy 2026"
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.8rem' }}>Document Type *</label>
                <input type="text" value={docType} onChange={e => setDocType(e.target.value)} placeholder="e.g. Policy, Circular, SOP..."
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.8rem' }}>Attach File (optional)</label>
              {!docFile ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1rem', borderRadius: 8, border: '2px dashed #c7d2fe', background: '#f5f3ff', cursor: 'pointer', fontSize: '0.875rem', color: '#6366f1', fontWeight: 500 }}>
                  <Paperclip size={16} />
                  Click to attach a document (PDF, DOC, DOCX, etc.)
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" style={{ display: 'none' }} />
                </label>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
                  <FileText size={16} color="#16a34a" />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#15803d' }}>{docFile.filename}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{formatSize(docFile.size)}</p>
                  </div>
                  <button type="button" onClick={() => { setDocFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.8rem' }}>Additional Note (optional)</label>
              <textarea value={docNote} onChange={e => setDocNote(e.target.value)} placeholder="Any additional instructions..." rows={3}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}
        {emailType === 'location' && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
              <MapPin size={15} color="#6366f1" /> GPS Location Details
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.8rem' }}>Saved GPS Location *</label>
              <select value={locationId} onChange={e => setLocationId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 0.875rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
                <option value="">-- Select a saved location --</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} — {loc.locationType} ({loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)})</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.8rem' }}>Additional Note (optional)</label>
              <textarea value={locationNote} onChange={e => setLocationNote(e.target.value)} placeholder="Add context for the location share..." rows={3}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}

        {emailType === 'holiday' && (
          <div style={{ background: '#fafaf9', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
              <Calendar size={15} color="#6366f1" /> Holiday Details
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.8rem' }}>Select Holiday *</label>
              <select value={selectedHoliday} onChange={e => setSelectedHoliday(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
                <option value="">-- Select a holiday --</option>
                {holidays.map(h => (
                  <option key={h.id} value={h.id}>{h.name} -- {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.8rem' }}>Additional Note (optional)</label>
              <textarea value={holidayNote} onChange={e => setHolidayNote(e.target.value)} placeholder="e.g. Office will remain closed." rows={3}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={16} /> Sender Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.875rem' }}>Sender Email</label>
              <select value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', background: '#fff' }}>
                <option value="contact@cecubeindia.com">contact@cecubeindia.com</option>
                <option value="hr@cecubeindia.com">hr@cecubeindia.com</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.875rem' }}>Sender Name</label>
              <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="e.g. Cecube HR"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Only these two sender emails are allowed for blast sending.</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={16} /> Recipients
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: mode === 'select' ? '1rem' : 0 }}>
            <button type="button" onClick={() => { setMode('all'); setSelected([]); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '2px solid ' + (mode === 'all' ? '#6366f1' : '#e2e8f0'), background: mode === 'all' ? '#ede9fe' : '#fff', color: mode === 'all' ? '#4f46e5' : '#6b7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
              <Users size={14} /> All Employees ({employees.length})
            </button>
            <button type="button" onClick={() => setMode('select')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '2px solid ' + (mode === 'select' ? '#6366f1' : '#e2e8f0'), background: mode === 'select' ? '#ede9fe' : '#fff', color: mode === 'select' ? '#4f46e5' : '#6b7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
              <User size={14} /> Select Employees
            </button>
          </div>
          {mode === 'select' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: 200, overflowY: 'auto', padding: '0.5rem 0' }}>
              {employees.map(emp => (
                <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '1.5px solid ' + (selected.includes(emp.id) ? '#6366f1' : '#e2e8f0'), background: selected.includes(emp.id) ? '#ede9fe' : '#f9fafb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: selected.includes(emp.id) ? '#4f46e5' : '#374151', userSelect: 'none' }}>
                  <input type="checkbox" checked={selected.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} style={{ display: 'none' }} />
                  {emp.name} <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>({emp.empId || emp.email})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {emailType === 'general' && (
          <>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.875rem' }}>Subject</label>
              <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Important Announcement"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: '0.875rem' }}>Message</label>
              <textarea required value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message here..." rows={8}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.95rem', lineHeight: 1.6, resize: 'vertical', outline: 'none' }} />
            </div>
          </>
        )}

        {preview && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: 6, fontSize: '0.8rem' }}>Email Preview</div>
            <div style={{ fontSize: '0.8rem', color: '#0f172a', marginBottom: 8 }}><strong>Subject:</strong> {preview.sub}</div>
            <pre style={{ fontSize: '0.78rem', color: '#334155', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6 }}>{preview.msg}</pre>
          </div>
        )}

        <button type="submit" disabled={isSendDisabled()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 2rem', background: isSendDisabled() ? '#a5b4fc' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: isSendDisabled() ? 'not-allowed' : 'pointer' }}>
          <Send size={16} />
          {sending ? 'Sending...' : 'Send to ' + recipientCount + ' Employee' + (recipientCount !== 1 ? 's' : '')}
        </button>
      </form>
        </>
      )}
    </div>
  );
}
