import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

export interface LicenseData {
  code: string;
  isUsed: boolean;
  usedByUserId: string | null;
  usedByUserEmail?: string | null;
  createdAt: any;
  usedAt: any | null;
  createdBy: string;
}

export interface UserLicenseData {
  hasActiveLicense: boolean;
  licenseCode: string | null;
  claimedAt: any | null;
}

const ADMIN_EMAIL = 'wisesaniskala@gmail.com';

export const licenseService = {
  // Generate a new secure license code
  async generateLicense(adminEmail: string): Promise<string> {
    if (adminEmail !== ADMIN_EMAIL) {
      throw new Error('Unauthorized');
    }

    // Generate random 8-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like 1, I, 0, O
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Format as XXXX-XXXX
    code = `${code.substring(0, 4)}-${code.substring(4, 8)}`;

    const newLicense: LicenseData = {
      code,
      isUsed: false,
      usedByUserId: null,
      createdAt: serverTimestamp(),
      usedAt: null,
      createdBy: adminEmail,
    };

    await setDoc(doc(db, 'licenses', code), newLicense);
    return code;
  },

  // Validate and claim a license for a user
  async validateAndClaimLicense(code: string, userId: string, userEmail?: string | null): Promise<boolean> {
    const codeUpper = code.toUpperCase().trim();
    const licenseRef = doc(db, 'licenses', codeUpper);
    const licenseSnap = await getDoc(licenseRef);

    if (!licenseSnap.exists()) {
      throw new Error('Kode lisensi tidak ditemukan.');
    }

    const licenseData = licenseSnap.data() as LicenseData;

    if (licenseData.isUsed) {
      if (licenseData.usedByUserId === userId) {
        // Already claimed by this exact user
        return true; 
      }
      throw new Error('Kode lisensi sudah digunakan oleh pengguna lain.');
    }

    // Mark as used
    await updateDoc(licenseRef, {
      isUsed: true,
      usedByUserId: userId,
      usedByUserEmail: userEmail || null,
      usedAt: serverTimestamp(),
    });

    // Save to user's profile
    const userLicenseRef = doc(db, `users/${userId}/accountInfo`, 'license');
    await setDoc(userLicenseRef, {
      hasActiveLicense: true,
      licenseCode: codeUpper,
      claimedAt: serverTimestamp(),
    } as UserLicenseData, { merge: true });

    return true;
  },

  // Retrieve all generated licenses (Admin only)
  async getAllLicenses(adminEmail: string): Promise<LicenseData[]> {
    if (adminEmail !== ADMIN_EMAIL) {
      throw new Error('Unauthorized');
    }

    const q = query(collection(db, 'licenses'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as LicenseData).sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
  }
};
