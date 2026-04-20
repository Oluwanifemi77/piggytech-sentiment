'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The dashboard now lives at /  — redirect any /dashboard visitors there.
export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return null;
}
