'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-provider';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserLicenseData } from '@/lib/license-service';
import { useRouter, usePathname } from 'next/navigation';

interface LicenseContextType {
  hasValidLicense: boolean | null; // null means still checking
  loadingLicense: boolean;
}

const LicenseContext = createContext<LicenseContextType>({
  hasValidLicense: null,
  loadingLicense: true,
});

export const useLicense = () => useContext(LicenseContext);

export const LicenseProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [hasValidLicense, setHasValidLicense] = useState<boolean | null>(null);
  const [loadingLicense, setLoadingLicense] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setHasValidLicense(false);
      setLoadingLicense(false);
      return;
    }

    if (user.email === 'wisesaniskala@gmail.com') {
       // Admin always has valid access
       setHasValidLicense(true);
       setLoadingLicense(false);
       return;
    }

    const licenseRef = doc(db, `users/${user.uid}/accountInfo`, 'license');
    
    setLoadingLicense(true);
    const unsubscribe = onSnapshot(licenseRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserLicenseData;
        setHasValidLicense(data.hasActiveLicense);
      } else {
        setHasValidLicense(false);
      }
      setLoadingLicense(false);
    }, (error) => {
      console.error("Error fetching license:", error);
      setHasValidLicense(false);
      setLoadingLicense(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Route protection logic
  useEffect(() => {
    if (authLoading || loadingLicense) return;

    const isAdminRoute = pathname?.startsWith('/admin');
    const isLicenseRoute = pathname?.startsWith('/enter-license');
    const isLoginRoute = pathname === '/login';

    if (user) {
       // User is logged in
       if (user.email === 'wisesaniskala@gmail.com' && isAdminRoute) {
          // Allow admin to access admin route
          return;
       }

       if (isAdminRoute && user.email !== 'wisesaniskala@gmail.com') {
           router.replace('/'); // Redirect non-admins away from admin
           return;
       }

       if (!hasValidLicense && !isLicenseRoute && !isAdminRoute) {   
          // If no license, go to enter-license
          router.replace('/enter-license');
       } else if (hasValidLicense && isLicenseRoute) {
          // If has license but on enter-license, go to home
          router.replace('/');
       }
    } else {
       // Not logged in
       if (!isLoginRoute && !pathname?.startsWith('/register')) {
         router.replace('/login');
       }
    }
  }, [user, authLoading, hasValidLicense, loadingLicense, pathname, router]);


  return (
    <LicenseContext.Provider value={{ hasValidLicense, loadingLicense }}>
      {children}
    </LicenseContext.Provider>
  );
};
