'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function SecretAdminGate({ children }: { children: React.ReactNode }) {
    const [clickCount, setClickCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (clickCount >= 7) {
            setIsOpen(true);
            setClickCount(0);
        }
        
        const timer = setTimeout(() => {
            if (clickCount > 0 && clickCount < 7) {
                setClickCount(0);
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [clickCount]);

    const handleVerify = async () => {
        if (!password) return;
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, 'wisesaniskala@gmail.com', password);
            setIsOpen(false);
            setPassword('');
            router.push('/admin');
            toast({ title: 'Akses Diberikan', description: 'Selamat masuk, Admin.' });
        } catch (e: any) {
            toast({ title: 'Akses Ditolak', description: 'Kredensial tidak valid.', variant: 'destructive' });
        }
        setLoading(false);
    };

    return (
        <>
            <div 
               onClick={(e) => {
                   setClickCount(prev => prev + 1);
               }} 
               className="cursor-pointer inline-flex items-center"
            >
                {children}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Akses Terbatas</DialogTitle>
                        <DialogDescription>
                            Sistem mendeteksi pola akses administrasi. Silakan masukkan kata sandi keamanan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Input 
                            type="password" 
                            placeholder="Kata Sandi Admin" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter') handleVerify() }}
                        />
                        <Button className="w-full" onClick={handleVerify} disabled={loading}>
                            {loading ? 'Memverifikasi...' : 'Verifikasi'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
