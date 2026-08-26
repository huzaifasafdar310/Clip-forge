import React, { useState, useEffect } from 'react';
import {
  Youtube,
  UploadCloud,
  CheckCircle2,
  Lock,
  Globe,
  EyeOff,
  Sparkles,
  ChevronRight,
  Clock,
  Check,
  Film,
  Hash,
  Share2,
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
        description: c.description || 'Watch full highlight #Shorts #Viral #Trending',
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

  const toggleSelectAll = () => {
    if (selectedIds.length === clips.length) {
      setSelectedIds(editingClipId ? [editingClipId] : [clips[0].id]);
    } else {
      setSelectedIds(clips.map((c) => c.id));
    }
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

  const appendHashtag = (clipId: number, tag: string) => {
    const current = editedMetadata[clipId]?.description || '';
    if (!current.includes(tag)) {
      handleMetadataChange(clipId, 'description', `${current.trim()} ${tag}`);
    }
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

  const isCurrentSelected = currentEditingClip ? selectedIds.includes(currentEditingClip.id) : false;

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
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Channel Destination Bar */}
        <div className="flex items-center justify-between p-3 px-4 bg-surface-2 border border-border-subtle rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center text-red-500 shrink-0">
              <Youtube className="w-4 h-4 fill-current" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
                Destination Channel
              </p>
              <p className="text-xs font-bold text-foreground">
                {user?.channelTitle || user?.name || 'Connected YouTube Account'}
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>OAuth Connected</span>
          </span>
        </div>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: Clips Selector (5 Cols) */}
          <div className="md:col-span-5 flex flex-col space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono uppercase text-muted-foreground font-semibold">
                Select Clips ({selectedIds.length}/{clips.length})
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-mono text-primary hover:underline font-semibold"
              >
                {selectedIds.length === clips.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {clips.map((clip, index) => {
                const isSelected = selectedIds.includes(clip.id);
                const isEditing = editingClipId === clip.id;

                return (
                  <div
                    key={clip.id}
                    onClick={() => setEditingClipId(clip.id)}
                    className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isEditing
                        ? 'bg-surface-2 border-primary shadow-glow-sm'
                        : isSelected
                        ? 'bg-surface-2/60 border-border-subtle hover:border-primary/40'
                        : 'bg-surface-0 border-border-subtle/70 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectClip(clip.id);
                        }}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'bg-primary border-primary text-black font-black shadow-sm'
                            : 'border-border-muted bg-surface-1 hover:border-primary/60'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      {/* Clip Info */}
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {editedMetadata[clip.id]?.title || clip.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {clip.startTime} - {clip.endTime}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-surface-0 border border-border-subtle text-primary font-bold">
                            9:16
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isEditing ? 'text-primary translate-x-0.5' : 'text-muted-foreground/30'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Metadata Editor for Selected Clip (7 Cols) */}
          <div className="md:col-span-7 bg-surface-2/80 rounded-2xl border border-border-subtle p-4 space-y-3.5 shadow-sm">
            {/* Header with status */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-foreground truncate">
                  Clip Details ({currentEditingClip?.startTime} - {currentEditingClip?.endTime})
                </h4>
              </div>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border shrink-0 ${
                  isCurrentSelected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : 'bg-surface-0 text-muted-foreground border-border-subtle'
                }`}
              >
                {isCurrentSelected ? '✓ Selected for upload' : '○ Unchecked'}
              </span>
            </div>

            {currentEditingClip && (
              <>
                {/* Title */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-mono uppercase text-muted-foreground font-semibold text-[10px]">
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
                    className="text-xs font-semibold bg-surface-0 border-border-subtle focus:border-primary h-9"
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-mono uppercase text-muted-foreground font-semibold text-[10px]">
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

                  {/* Hashtag Quick-Add Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">Quick Tags:</span>
                    {['#Shorts', '#Viral', '#Trending', '#YouTubeShorts'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendHashtag(currentEditingClip.id, tag)}
                        className="px-2 py-0.5 rounded-md bg-surface-0 border border-border-subtle text-[10px] font-mono text-primary hover:border-primary/50 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy Visibility */}
                <div className="space-y-1 pt-0.5">
                  <label className="font-mono uppercase text-muted-foreground font-semibold text-[10px] block">
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
                          className={`p-2 rounded-xl border text-left flex flex-col items-start gap-0.5 transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                              : 'bg-surface-0 border-border-subtle text-muted-foreground hover:text-foreground hover:border-border-muted'
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
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          <p className="text-[11px] text-muted-foreground font-mono">
            Ready to render & stream <span className="text-primary font-bold">{selectedIds.length}</span> clip{selectedIds.length > 1 ? 's' : ''} to YouTube.
          </p>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={selectedIds.length === 0}
              onClick={handleConfirm}
              className="gap-2 font-bold shadow-glow-sm text-xs"
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
