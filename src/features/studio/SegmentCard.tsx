import React from 'react';
import { Flame } from 'lucide-react';
import { Clip } from '@/types/api';
import { cn, calculateViralScore } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface SegmentCardProps {
  clip: Clip;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

export const SegmentCard: React.FC<SegmentCardProps> = ({
  clip,
  index,
  isActive,
  onSelect,
}) => {
  const viralScore = calculateViralScore(index);

  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5',
        isActive
          ? 'bg-surface-2 border-primary shadow-glow-sm'
          : 'bg-surface-1 border-border-subtle hover:border-border-muted hover:bg-surface-2'
      )}
    >
      <div className="flex justify-between items-center text-[10px] font-mono gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={isActive ? 'primary' : 'default'} className="gap-1 text-[10px]">
            <Flame className="w-3 h-3 fill-current" />
            <span>{viralScore}% Hook</span>
          </Badge>
          {clip.transcript_fallback ? (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px]">
              Smart Split
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px]">
              AI Transcript
            </span>
          )}
          {clip.render_status === 'rendered' && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px]">
              9:16 Ready
            </span>
          )}
        </div>
        <span className="text-muted-foreground whitespace-nowrap">
          {clip.startTime} - {clip.endTime}
        </span>
      </div>


      <h4 className="text-xs font-bold text-foreground truncate">{clip.title}</h4>

      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
        {clip.reasoning || clip.description || 'AI highlighted conversational moment'}
      </p>
    </div>
  );
};
