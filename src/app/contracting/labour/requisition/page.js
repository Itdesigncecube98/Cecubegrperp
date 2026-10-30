'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LabourRequisition() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/contracting/labour/requisition-browse');
  }, [router]);

  return null;
}
