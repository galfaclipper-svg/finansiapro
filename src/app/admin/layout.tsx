'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.email !== 'wisesaniskala@gmail.com') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.email !== 'wisesaniskala@gmail.com') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500 animate-pulse">Memverifikasi Akses Admin...</p>
      </div>
    );
  }

  return <>{children}</>;
}
