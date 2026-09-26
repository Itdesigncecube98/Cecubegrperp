'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResourceAllocationRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/contracting/work-completion');
  }, [router]);

  return null;
}
