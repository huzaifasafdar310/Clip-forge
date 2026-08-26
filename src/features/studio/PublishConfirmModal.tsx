import React, { useState, useEffect } from 'react';
import {
  Youtube,
  UploadCloud,
  CheckCircle2,
  Lock,
  Globe,
  EyeOff,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Clip } from '@/types/api';
import { useAuth } from '@/context/AuthContext';

interface PublishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: Clip[];
  activeClip: Clip | null;
  onConfirmPublish: (clipsToUpload: Clip[]) => void;
}

export const PublishConfirmModal: React.FC<PublishConfirmModalProps> = ({
  isOpen,
  onClose,
  clips,
  activeClip,
  onConfirmPublish,
}) => {
  const { user } = useAuth();

  // Selected clip IDs for batch or single upload
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingClipId, setEditingClipId] = useState<number | null>(null);

  // Per-clip edited metadata map
  const [editedMetadata, setEditedMetadata] = useState<
    Record<
      number,
      {
        title: string;
        description: string;
        privacyStatus: 'public' | 'unlisted' | 'private';
      }
    >
  >({});

  // Synchronize on open or clip change
  useEffect(() => {
    if (!isOpen) return;

    const initialMap: Record<
      number,
      { title: string; description: string; privacyStatus: 'public' | 'unlisted' | 'private' }
    > = {};

    clips.forEach((c) => {
      initialMap[c.id] = {
        title: c.title || 'Viral Short Moment #Shorts',
        description: c.description || 'Watch full highlight #Shorts #Viral',
        privacyStatus: (c.privacyStatus as any) || 'public',
      };
    });

    setEditedMetadata(initialMap);

    if (activeClip) {
      setSelectedIds([activeClip.id]);
      setEditingClipId(activeClip.id);
    } else if (clips.length > 0) {
      setSelectedIds([clips[0].id]);
      setEditingClipId(clips[0].id);
    }
  }, [isOpen, clips, activeClip]);

  const toggleSelectClip = (clipId: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(clipId)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter((id) => id !== clipId);
      } else {
        return [...prev, clipId];
      }
    });
    setEditingClipId(clipId);
  };

  const handleMetadataChange = (
    clipId: number,
    field: 'title' | 'description' | 'privacyStatus',
    value: string
  ) => {
    setEditedMetadata((prev) => ({
      ...prev,
      [clipId]: {
        ...prev[clipId],
        [field]: value,
      },
    }));
  };

  const currentEditingClip =
    clips.find((c) => c.id === editingClipId) || (clips.length > 0 ? clips[0] : null);

  const currentMeta = currentEditingClip && editedMetadata[currentEditingClip.id]
    ? editedMetadata[currentEditingClip.id]
    : {
        title: currentEditingClip?.title || '',
        description: currentEditingClip?.description || '',
        privacyStatus: (currentEditingClip?.privacyStatus as any) || 'public',
      };

  const handleConfirm = () => {
    const clipsToUpload = clips
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => {
        const meta = editedMetadata[c.id];
        return {
          ...c,
          title: meta?.title || c.title,
          description: meta?.description || c.description,
          privacyStatus: meta?.privacyStatus || c.privacyStatus || 'public',
        };
      });

    onClose();
    onConfirmPublish(clipsToUpload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm YouTube Shorts Publishing"
      description="Review and customize which clips to publish and their metadata before uploading."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Connected Channel Destination Banner */}
        <div className="flex items-center justify-between p-3.5 bg-surface-2 border border-border-subtle rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-500">
              <Youtube className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
                Destination YouTube Channel
              </p>
              <p className="text-sm font-bold text-foreground">
                {user?.channelTitle || user?.name || 'Connected YouTube Account'}
              </p>
            </div>
          </div>
          <Badge variant="success" className="font-mono text-[10px] uppercase">
            OAuth Connected
          </Badge>
        </div>

        {/* 2-Column Selection & Metadata Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Clips Selector (5 Cols) */}
          <div className="md:col-span-5 space-y-2.5">
            <label className="text-xs font-mono uppercase text-muted-foreground font-semibold flex items-center justify-between">
              <span>Select Clips ({selectedIds.length}/{clips.length})</span>
              <button
                type="button"
                onClick={() => setSelectedIds(clips.map((c) => c.id))}
                className="text-[10px] text-primary hover:underline"
              >
                Select All
              </button>
            </label>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {clips.map((clip, index) => {
                const isSelected = selectedIds.includes(clip.id);
                const isEditing = editingClipId === clip.id;

                return (
                  <div
                    key={clip.id}
                    onClick={() => {
                      setEditingClipId(clip.id);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isEditing
                        ? 'bg-surface-2 border-primary shadow-glow-sm'
                        : isSelected
                        ? 'bg-surface-2/60 border-border-subtle hover:border-primary/50'
                        : 'bg-surface-0 border-border-subtle opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectClip(clip.id);
                        }}
                        className="accent-primary w-4 h-4 rounded cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {editedMetadata[clip.id]?.title || clip.title}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {clip.startTime} - {clip.endTime}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isEditing ? 'text-primary translate-x-0.5' : 'text-muted-foreground/40'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Metadata Editor for Selected Clip (7 Cols) */}
          <div className="md:col-span-7 bg-surface-2 p-4 rounded-2xl border border-border-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Clip Details ({currentEditingClip?.startTime} - {currentEditingClip?.endTime})</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {selectedIds.includes(currentEditingClip?.id || 0) ? '✅ Selected for upload' : '❌ Unchecked'}
              </span>
            </div>

            {currentEditingClip && (
              <>
                {/* Title */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-mono uppercase text-muted-foreground font-semibold text-[11px]">
                      YouTube Shorts Title
                    </label>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {currentMeta.title.length}/100
                    </span>
                  </div>
                  <Input
                    value={currentMeta.title}
                    onChange={(e) =>
                      handleMetadataChange(currentEditingClip.id, 'title', e.target.value)
                    }
                    placeholder="Engaging viral title #Shorts"
                    className="text-xs font-semibold"
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-mono uppercase text-muted-foreground font-semibold text-[11px]">
                      Description & Hashtags
                    </label>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {currentMeta.description.length}/500
                    </span>
                  </div>
                  <textarea
                    value={currentMeta.description}
                    onChange={(e) =>
                      handleMetadataChange(currentEditingClip.id, 'description', e.target.value)
                    }
                    rows={3}
                    maxLength={500}
                    placeholder="Short description with #Shorts #Viral #Trending hashtags"
                    className="w-full bg-surface-0 border border-border-subtle rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Privacy Visibility */}
                <div className="space-y-1.5">
                  <label className="font-mono uppercase text-muted-foreground font-semibold text-[11px] block">
                    Privacy Visibility
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'public', label: 'Public', icon: Globe, desc: 'Instant Live' },
                      { value: 'unlisted', label: 'Unlisted', icon: EyeOff, desc: 'Link only' },
                      { value: 'private', label: 'Private', icon: Lock, desc: 'Only you' },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = currentMeta.privacyStatus === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            handleMetadataChange(
                              currentEditingClip.id,
                              'privacyStatus',
                              opt.value as any
                            )
                          }
                          className={`p-2 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                              : 'bg-surface-0 border-border-subtle text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            <Icon className="w-3.5 h-3.5" />
                            <span>{opt.label}</span>
                          </div>
                          <span className="text-[9px] font-mono opacity-70">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <p className="text-[11px] text-muted-foreground font-mono">
            Ready to render & stream <span className="text-primary font-bold">{selectedIds.length}</span> clip{selectedIds.length > 1 ? 's' : ''} to YouTube.
          </p>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={selectedIds.length === 0}
              onClick={handleConfirm}
              className="gap-2 font-bold shadow-glow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Confirm & Upload ({selectedIds.length})</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
