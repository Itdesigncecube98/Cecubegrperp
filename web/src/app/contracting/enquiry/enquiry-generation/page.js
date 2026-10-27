'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EnquiryGenerationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/contracting/enquiry/browse');
  }, [router]);

  return null;
}
