"use client";

import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import { Save, Home, ChevronRight, ArrowLeft } from 'lucide-react';
import '../../contracting.css';

const COMPANY_ID = "demo-company-id";

const EMPTY_FORM = {
  id: null,
  employeeCode: "", title: "", firstName: "", middleName: "", lastName: "",
  status: "ACTIVE", joiningDate: "", leavingDate: "", leavingReason: "", employmentType: "",
  biometricRefNo: "", dailyWages: "",
  fatherName: "", motherName: "", gender: "", dateOfBirth: "", bloodGroup: "", maritalStatus: "",
  spouseName: "", identificationMarks: "",
  panNo: "", aadharNo: "", uan: "", pfNo: "", pfStartDate: "", esiNo: "",
  passportNumber: "", passportIssuedBy: "",
  permanentAddress: "", temporaryAddress: "", mobile1: "", mobile2: "",
  email1: "", email2: "", telephoneOffice1: "", telephoneOffice2: "", telephoneResidence: "",
};

function Field({ label, required, children }) {
  return (
    <div>
      <label className="contracting-label">
        {label} {required && <span style={{color: 'red'}}>*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="contracting-input"
      style={{ width: '100%' }}
    />
  );
}

export default function LabourMasterPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(field) {
    return (value) => setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = { companyId: COMPANY_ID, ...form };
      const res = await fetch(form.id ? `/api/labour/${form.id}` : "/api/labour", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setForm({ ...form, id: json.data.id });
      alert("Labour record saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="contracting-container" style={{ background: '#f5f7fa', minHeight: '100vh', padding: '16px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'white', padding: '12px 20px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>
          <span style={{ color: '#0ea5e9' }}>👥</span> Labour Master
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#64748b', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Labour Master
          </div>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: '#475569' }}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}

      <div style={{ background: 'white', borderRadius: '4px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#334155' }}>
          Add Labour
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <Field label="Employee Code" required><TextInput value={form.employeeCode} onChange={set("employeeCode")} /></Field>
            <Field label="Title" required>
              <select value={form.title} onChange={(e) => set("title")(e.target.value)} className="contracting-input" style={{ width: '100%' }}>
                <option value="">--Select--</option>
                <option>Mr</option><option>Mrs</option><option>Ms</option><option>Dr</option>
              </select>
            </Field>
            <Field label="First Name" required><TextInput value={form.firstName} onChange={set("firstName")} /></Field>
            <Field label="Middle Name"><TextInput value={form.middleName} onChange={set("middleName")} /></Field>

            <Field label="Last Name"><TextInput value={form.lastName} onChange={set("lastName")} /></Field>
            <Field label="Status" required>
              <select value={form.status} onChange={(e) => set("status")(e.target.value)} className="contracting-input" style={{ width: '100%' }}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </Field>
            <Field label="Joining Date"><TextInput type="date" value={form.joiningDate} onChange={set("joiningDate")} /></Field>
            <Field label="Leaving Date"><TextInput type="date" value={form.leavingDate} onChange={set("leavingDate")} /></Field>

            <Field label="Leaving Reason">
              <select value={form.leavingReason} onChange={(e) => set("leavingReason")(e.target.value)} className="contracting-input" style={{ width: '100%' }}>
                <option value="">--Select--</option>
                <option>Resignation</option><option>Termination</option><option>Retirement</option><option>Contract End</option>
              </select>
            </Field>
            <Field label="Employment Types">
              <select value={form.employmentType} onChange={(e) => set("employmentType")(e.target.value)} className="contracting-input" style={{ width: '100%' }}>
                <option value="">--Select--</option>
                <option>Permanent</option><option>Contract</option><option>Daily Wage</option><option>Apprentice</option>
              </select>
            </Field>
            <Field label="Biometric Ref No"><TextInput value={form.biometricRefNo} onChange={set("biometricRefNo")} /></Field>
            <Field label="Daily wages"><TextInput type="number" value={form.dailyWages} onChange={set("dailyWages")} /></Field>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '4px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#334155' }}>
          Personal Details
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <Field label="Father Name"><TextInput value={form.fatherName} onChange={set("fatherName")} /></Field>
            <Field label="Mother Name"><TextInput value={form.motherName} onChange={set("motherName")} /></Field>
            <Field label="Gender" required>
              <select value={form.gender} onChange={(e) => set("gender")(e.target.value)} className="contracting-input" style={{ width: '100%' }}>
                <option value="">--Select--</option>
                <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Date of Birth"><TextInput type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} /></Field>

            <Field label="Blood Group">
              <select value={form.bloodGroup} onChange={(e) => set("bloodGroup")(e.target.value)} className="contracting-input" style={{ width: '100%' }}>
                <option value="">--Select--</option>
                {["A_POS","A_NEG","B_POS","B_NEG","O_POS","O_NEG","AB_POS","AB_NEG"].map((bg) => (
                  <option key={bg} value={bg}>{bg.replace("_POS", "+").replace("_NEG", "-")}</option>
                ))}
              </select>
            </Field>
            <Field label="Marital Status">
              <select value={form.maritalStatus} onChange={(e) => set("maritalStatus")(e.target.value)} className="contracting-input" style={{ width: '100%' }}>
                <option value="">--Select--</option>
                <option value="SINGLE">Single</option><option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option><option value="WIDOWED">Widowed</option>
              </select>
            </Field>
            <Field label="Spouce Name"><TextInput value={form.spouseName} onChange={set("spouseName")} /></Field>
            <Field label="Identification Marks"><TextInput value={form.identificationMarks} onChange={set("identificationMarks")} /></Field>

            <Field label="PAN/PIN"><TextInput value={form.panNo} onChange={set("panNo")} /></Field>
            <Field label="Aadhar No"><TextInput value={form.aadharNo} onChange={set("aadharNo")} /></Field>
            <Field label="UAN"><TextInput value={form.uan} onChange={set("uan")} /></Field>
            <Field label="PF No"><TextInput value={form.pfNo} onChange={set("pfNo")} /></Field>

            <Field label="PF Start Date"><TextInput type="date" value={form.pfStartDate} onChange={set("pfStartDate")} /></Field>
            <Field label="ESI No"><TextInput value={form.esiNo} onChange={set("esiNo")} /></Field>
            <Field label="Passport Number"><TextInput value={form.passportNumber} onChange={set("passportNumber")} /></Field>
            <Field label="Passport Issued By"><TextInput value={form.passportIssuedBy} onChange={set("passportIssuedBy")} /></Field>

            <Field label="Permanent Address"><TextInput value={form.permanentAddress} onChange={set("permanentAddress")} /></Field>
            <Field label="Temporary Address"><TextInput value={form.temporaryAddress} onChange={set("temporaryAddress")} /></Field>
            <Field label="Mobile 1"><TextInput value={form.mobile1} onChange={set("mobile1")} /></Field>
            <Field label="Mobile 2"><TextInput value={form.mobile2} onChange={set("mobile2")} /></Field>

            <Field label="Email 1"><TextInput value={form.email1} onChange={set("email1")} /></Field>
            <Field label="Email 2"><TextInput value={form.email2} onChange={set("email2")} /></Field>
            <Field label="Telephone Office - 1"><TextInput value={form.telephoneOffice1} onChange={set("telephoneOffice1")} /></Field>
            <Field label="Telephone Office - 2"><TextInput value={form.telephoneOffice2} onChange={set("telephoneOffice2")} /></Field>

            <Field label="Telephone Residence"><TextInput value={form.telephoneResidence} onChange={set("telephoneResidence")} /></Field>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button onClick={handleSave} disabled={saving} className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 24px', opacity: saving ? 0.7 : 1 }}>
          <Save size={18} /> {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
