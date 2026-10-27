'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QuotationEntryForm from '../QuotationEntryForm';

function QuotationEntryRoute() {
  const searchParams = useSearchParams();
  return <QuotationEntryForm quotationId={searchParams.get('id') || ''} />;
}

export default function QuotationEntryPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: '#64748b' }}>Loading quotation...</div>}>
      <QuotationEntryRoute />
    </Suspense>
  );
}
