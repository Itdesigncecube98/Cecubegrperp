'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) {
      router.replace('/employee/dashboard');
      return;
    }

    router.replace('/login');
  }, [router]);

  return null;
}
