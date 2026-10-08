'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import DocApprovalsPanel from '../../../components/DocApprovalsPanel';

export default function DocGeneratorAdminPage() {
  const router = useRouter();
  const [role, setRole] = React.useState('HR');

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button 
            onClick={() => router.back()} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '12px' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            {role === 'HR' ? 'Doc Generator — HR Admin' : 'Doc Generator — HOD Review'}
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            {role === 'HR' ? 'Review, verify, and trace all employee document requests.' : 'Final review and approval by HODs.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => setRole('HR')} 
              style={{ padding: '6px 12px', border: 'none', background: role === 'HR' ? '#0ea5e9' : 'transparent', color: role === 'HR' ? 'white' : '#64748b', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
            >
              HR Verification
            </button>
            <button 
              onClick={() => setRole('HOD')} 
              style={{ padding: '6px 12px', border: 'none', background: role === 'HOD' ? '#be185d' : 'transparent', color: role === 'HOD' ? 'white' : '#64748b', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
            >
              HOD Review
            </button>
          </div>
          <button
            onClick={() => router.push('/dashboard/doc-generator/create')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', height: 'fit-content' }}
          >
            <Plus size={16} /> Generate Document
          </button>
        </div>
      </div>
      <DocApprovalsPanel role={role} />
    </div>
  );
}
