import React from 'react';
import { Scissors, Type, Smartphone, Share2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const FeatureGrid: React.FC = () => {
  const features = [
    {
      icon: Scissors,
      title: 'Groq AI Highlight Scoring',
      desc: 'LLaMA 3.3 70B evaluates transcript dialog to pinpoint peak conversational hooks, insights, and viral moments.',
      tag: '30-60s Optimal',
    },
    {
      icon: Type,
      title: 'Kinetic Dynamic Captions',
      desc: 'High-impact subtitles styled with TikTok Pop, Karaoke, and Bold Stroke presets burned directly in the browser.',
      tag: 'TikTok Pop Style',
    },
    {
      icon: Smartphone,
      title: '9:16 Smart Reframe',
      desc: 'Client-side HTML5 Canvas and MediaStream cropping ready for Shorts, Reels, and TikTok feeds.',
      tag: '720x1280 & 1080x1920',
    },
    {
      icon: Share2,
      title: 'Direct Shorts Publishing',
      desc: 'Direct integration with Google OAuth 2.0 and YouTube Data API v3 for seamless in-browser upload.',
      tag: 'YouTube Shorts',
    },
  ];

  return (
    <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">
          Built for creators who value retention & speed.
        </h2>
        <p className="text-sm text-muted-foreground">
          Turn long-form videos into engaging 9:16 short-form assets with 100% in-browser processing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <Card key={idx} glow className="flex flex-col justify-between p-6 space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
              <div className="pt-3 border-t border-border-subtle">
                <span className="text-[11px] font-mono font-semibold text-primary">
                  {feature.tag}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
};
