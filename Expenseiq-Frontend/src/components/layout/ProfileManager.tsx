'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Check } from 'lucide-react';
import { useProfiles } from '@/lib/hooks/queries';
import { api } from '@/lib/api/client';
import { getActiveProfileId, setActiveProfileId } from '@/lib/api/profile';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useToast } from '@/components/ui/Toast';
import { Button, Modal, Input, ConfirmDialog, Badge } from '@/components/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { Profile, NewProfile } from '@/lib/types/api';

export function ProfileManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: profiles, isLoading } = useProfiles();
  const activeId = getActiveProfileId();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteProfile, setDeleteProfile] = useState<Profile | undefined>();
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('👤');

  const createMutation = useMutation({
    mutationFn: (data: NewProfile) => api.createProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles.all });
      toast('Profile created');
      setAddOpen(false);
      setNewName('');
    },
    onError: () => toast('Failed to create profile', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (profileId: string) => api.deleteProfile(profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles.all });
      toast('Profile deleted');
      setDeleteProfile(undefined);
    },
    onError: () => toast('Failed to delete profile', 'error'),
  });

  function switchProfile(profileId: string) {
    setActiveProfileId(profileId);
    // Invalidate all resource caches so they refetch for the new profile
    qc.invalidateQueries();
    toast(`Switched to profile`);
    onClose();
  }

  function handleCreate(ev: React.FormEvent) {
    ev.preventDefault();
    if (!newName.trim()) return;
    const profileId = newName.toLowerCase().replace(/\s+/g, '-');
    createMutation.mutate({ profileId, name: newName, icon: newIcon, isDefault: false });
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Profiles" size="sm">
        {isLoading ? (
          <SkeletonCard />
        ) : (
          <div className="space-y-3">
            {profiles?.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-card-border bg-bg-2">
                <span className="text-lg">{p.icon || '👤'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{p.name}</p>
                  <p className="text-[11px] text-text-3">{p.profileId}</p>
                </div>
                {p.profileId === activeId ? (
                  <Badge variant="accent"><Check className="w-3 h-3 mr-1" />Active</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => switchProfile(p.profileId)}>Switch</Button>
                )}
                {!p.isDefault && p.profileId !== activeId && (
                  <Button variant="icon" size="sm" onClick={() => setDeleteProfile(p)} aria-label="Delete profile">
                    <Trash2 className="w-3.5 h-3.5 text-expense" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddOpen(true)} className="w-full">
              Add Profile
            </Button>
          </div>
        )}
      </Modal>

      {/* Add profile sub-modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Profile" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Profile Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Work, Family..." required />
          <Input label="Icon (emoji)" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="👤" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteProfile}
        onClose={() => setDeleteProfile(undefined)}
        onConfirm={() => { if (deleteProfile) deleteMutation.mutate(deleteProfile.profileId); }}
        message={`Delete "${deleteProfile?.name}" profile? This will delete ALL data (transactions, budgets, goals, etc.) for this profile. This cannot be undone.`}
        confirmLabel="Delete Everything"
        loading={deleteMutation.isPending}
      />
    </>
  );
}
