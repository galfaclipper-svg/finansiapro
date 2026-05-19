'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppState } from '@/hooks/use-app-state';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Pencil, Save, X } from 'lucide-react';
import type { ReportRecipient } from '@/lib/types';

export function ReportRecipientsManager() {
  const { companyProfile, setCompanyProfile } = useAppState();
  const { toast } = useToast();
  
  const recipients = companyProfile.reportRecipients || [];
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ReportRecipient>>({});

  const handleAdd = () => {
    const newId = Date.now().toString();
    setIsEditing(newId);
    setEditForm({ id: newId, name: '', whatsapp: '', email: '' });
  };

  const handleEdit = (r: ReportRecipient) => {
    setIsEditing(r.id);
    setEditForm({ ...r });
  };

  const handleSave = () => {
    if (!editForm.name) {
      toast({ variant: 'destructive', title: 'Validasi', description: 'Nama penerima harus diisi.' });
      return;
    }

    if (!editForm.whatsapp && !editForm.email) {
      toast({ variant: 'destructive', title: 'Validasi', description: 'Minimal isi satu media (WhatsApp atau Email).' });
      return;
    }

    let newRecipients = [...recipients];
    const existingIndex = newRecipients.findIndex((r) => r.id === editForm.id);
    
    if (existingIndex >= 0) {
      newRecipients[existingIndex] = editForm as ReportRecipient;
    } else {
      newRecipients.push(editForm as ReportRecipient);
    }

    setCompanyProfile({ ...companyProfile, reportRecipients: newRecipients });
    setIsEditing(null);
    toast({ title: 'Tersimpan', description: 'Kontak penerima berhasil disimpan.' });
  };

  const handleDelete = (id: string) => {
    const newRecipients = recipients.filter((r) => r.id !== id);
    setCompanyProfile({ ...companyProfile, reportRecipients: newRecipients });
    toast({ title: 'Terhapus', description: 'Kontak penerima berhasil dihapus.' });
  };

  const handleCancel = () => {
    setIsEditing(null);
    setEditForm({});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Penerima Laporan (Stakeholders)</CardTitle>
        <CardDescription>
          Kelola kontak stakeholder untuk memudahkan pengiriman laporan keuangan dan invoice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recipients.length === 0 && !isEditing ? (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
            Belum ada penerima laporan yang terdaftar.
          </div>
        ) : (
          <div className="space-y-3">
            {recipients.map((recipient) => (
              <div key={recipient.id}>
                {isEditing === recipient.id ? (
                  <div className="border p-4 rounded-md space-y-3 bg-muted/30">
                    <div className="grid gap-3">
                      <div>
                        <Label>Nama Penerima / Jabatan</Label>
                        <Input 
                          placeholder="Mis: Budi - Manajer" 
                          value={editForm.name || ''} 
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>No. WhatsApp (Awali dgn 62)</Label>
                          <Input 
                            placeholder="62813..." 
                            value={editForm.whatsapp || ''} 
                            onChange={(e) => setEditForm({...editForm, whatsapp: e.target.value})} 
                          />
                        </div>
                        <div>
                          <Label>Alamat Email</Label>
                          <Input 
                            placeholder="budi@example.com" 
                            type="email"
                            value={editForm.email || ''} 
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-1" /> Batal
                      </Button>
                      <Button size="sm" onClick={handleSave}>
                        <Save className="w-4 h-4 mr-1" /> Simpan
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium text-sm">{recipient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {recipient.whatsapp && `WA: ${recipient.whatsapp}`}
                        {recipient.whatsapp && recipient.email && ' | '}
                        {recipient.email && `Email: ${recipient.email}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(recipient)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(recipient.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isEditing && !recipients.find(r => r.id === isEditing) && (
               <div className="border p-4 rounded-md space-y-3 bg-muted/30">
               <div className="grid gap-3">
                 <div>
                   <Label>Nama Penerima / Jabatan</Label>
                   <Input 
                     placeholder="Mis: Budi - Manajer" 
                     value={editForm.name || ''} 
                     onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <Label>No. WhatsApp (Awali dgn 62)</Label>
                     <Input 
                       placeholder="62813..." 
                       value={editForm.whatsapp || ''} 
                       onChange={(e) => setEditForm({...editForm, whatsapp: e.target.value})} 
                     />
                   </div>
                   <div>
                     <Label>Alamat Email</Label>
                     <Input 
                       placeholder="budi@example.com" 
                       type="email"
                       value={editForm.email || ''} 
                       onChange={(e) => setEditForm({...editForm, email: e.target.value})} 
                     />
                   </div>
                 </div>
               </div>
               <div className="flex justify-end gap-2 pt-2">
                 <Button variant="outline" size="sm" onClick={handleCancel}>
                   <X className="w-4 h-4 mr-1" /> Batal
                 </Button>
                 <Button size="sm" onClick={handleSave}>
                   <Save className="w-4 h-4 mr-1" /> Simpan
                 </Button>
               </div>
             </div>
            )}
          </div>
        )}
      </CardContent>
      {!isEditing && (
        <CardFooter>
            <Button variant="outline" className="w-full" onClick={handleAdd}>
                <UserPlus className="w-4 h-4 mr-2" /> Tambah Penerima Baru
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}
