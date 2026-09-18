'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GanttChartRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/engineering/planning/msp-interface');
  }, [router]);

  return null;
}
