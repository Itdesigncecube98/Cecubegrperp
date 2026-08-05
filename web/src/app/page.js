'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard by default. AdminLayout will check for login.
    router.replace('/dashboard');
  }, [router]);

  return null;
}
