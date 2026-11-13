import React, { useState } from 'react';
import { ScheduledPost, ClipCandidate, SocialPlatform } from '../../types';
import { formatTimecode } from '../../utils/clippingRules';
import {
  Calendar,
  Clock,
  Send,
  Plus,
  CheckCircle2,
  Share2,
  Trash2,
  Check,
  Video,
} from 'lucide-react';

interface SocialScheduleViewProps {
  scheduledPosts: ScheduledPost[];
  candidates: ClipCandidate[];
  onAddScheduledPost: (post: ScheduledPost) => void;
  onRemoveScheduledPost: (id: string) => void;
}

export const SocialScheduleView: React.FC<SocialScheduleViewProps> = ({
  scheduledPosts,
  candidates,
  onAddScheduledPost,
  onRemoveScheduledPost,
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string>(candidates[0]?.id || '');
  const [platform, setPlatform] = useState<SocialPlatform>('tiktok');
  const [scheduledDate, setScheduledDate] = useState<string>('2026-03-26T18:00');
  const [caption, setCaption] = useState<string>(
    'Why 100,000 GPU nodes fail: it is not compute cores. It is optical transceivers melting from packet amplification.'
  );
  const [hashtags, setHashtags] = useState<string>('#hardware #silicon #engineering #techpodcast');

  const selectedClip = candidates.find((c) => c.id === selectedClipId) || candidates[0];

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClip) return;

    const newPost: ScheduledPost = {
      id: `post-${Date.now()}`,
      clipId: selectedClip.id,
      clipTitle: selectedClip.title,
      thumbnailUrl: '',
      platform,
      caption,
      hashtags: hashtags.split(' ').filter(Boolean),
      scheduledTime: new Date(scheduledDate).toISOString(),
      status: 'scheduled',
      aspectRatio: selectedClip.aspectRatio,
      durationSeconds: selectedClip.duration,
    };

    onAddScheduledPost(newPost);
  };

  const getPlatformLabel = (p: SocialPlatform) => {
    switch (p) {
      case 'tiktok':
        return 'TikTok';
      case 'youtube_shorts':
        return 'YouTube Shorts';
      case 'instagram_reels':
        return 'Instagram Reels';
      case 'linkedin':
        return 'LinkedIn Video';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
      {/* Title */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#E7E9EC] tracking-tight">
            7. Social Media Publishing & Multi-Channel Scheduler
          </h1>
          <p className="text-xs text-[#9299A3] mt-1">
            Distribute edited highlights across TikTok, YouTube Shorts, Instagram Reels, and LinkedIn with synchronized publishing time slots.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduler Composer Form */}
        <div className="lg:col-span-1 p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#292E34] pb-3">
            <Calendar className="w-4 h-4 text-[#B6F36B]" />
            <span className="text-sm font-semibold text-[#E7E9EC]">
              Schedule New Post
            </span>
          </div>

          <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
            {/* Select Clip */}
            <div>
              <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
                Select Highlight Clip
              </label>
              <select
                value={selectedClipId}
                onChange={(e) => {
                  setSelectedClipId(e.target.value);
                  const found = candidates.find((c) => c.id === e.target.value);
                  if (found) {
                    setCaption(found.title + ': ' + found.excerptQuote.replace(/"/g, ''));
                  }
                }}
                className="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] focus:outline-none"
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.duration}s · Score {c.score})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Platform Selector */}
            <div>
              <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
                Target Platform
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'tiktok' as SocialPlatform, label: 'TikTok' },
                    { id: 'youtube_shorts' as SocialPlatform, label: 'YouTube Shorts' },
                    { id: 'instagram_reels' as SocialPlatform, label: 'Instagram Reels' },
                    { id: 'linkedin' as SocialPlatform, label: 'LinkedIn' },
                  ] as const
                ).map((plat) => (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => setPlatform(plat.id)}
                    className={`p-2 rounded border text-left transition-colors ${
                      platform === plat.id
                        ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B]'
                        : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'
                    }`}
                  >
                    {plat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Time Picker */}
            <div>
              <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
                Publishing Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] font-mono focus:outline-none"
              />
            </div>

            {/* Caption Text Area */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider">
                  Post Caption Copy
                </label>
                <span className="text-[10px] text-[#626871] font-mono">
                  {caption.length} chars
                </span>
              </div>
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full p-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] leading-relaxed focus:outline-none"
                placeholder="Write compelling description..."
              />
            </div>

            {/* Hashtags */}
            <div>
              <label className="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
                Hashtags
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-9 rounded bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Schedule Cross-Platform Post</span>
            </button>
          </form>
        </div>

        {/* Scheduled Posts Queue & Calendar Strip */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs font-medium text-[#9299A3] px-1">
            <span>Publishing Schedule ({scheduledPosts.length})</span>
            <span className="font-mono text-[#626871]">Auto-sync queue active</span>
          </div>

          <div className="space-y-3">
            {scheduledPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-lg bg-[#191C20] border border-[#292E34] hover:border-[#383F47] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-center text-[#B6F36B] shrink-0">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#B6F36B]">
                          {getPlatformLabel(post.platform)}
                        </span>
                        <span className="text-[11px] text-[#626871]">·</span>
                        <span className="text-xs font-medium text-[#E7E9EC] truncate max-w-[280px]">
                          {post.clipTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#9299A3] mt-0.5 font-mono">
                        <Clock className="w-3 h-3 text-[#626871]" />
                        <span>{new Date(post.scheduledTime).toLocaleString()}</span>
                        <span>·</span>
                        <span>{post.durationSeconds}s</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#20242A] text-[#B6F36B] border border-[#292E34]">
                      {post.status}
                    </span>

                    <button
                      onClick={() => onRemoveScheduledPost(post.id)}
                      className="w-7 h-7 rounded hover:bg-[#20242A] text-[#626871] hover:text-[#EF4444] flex items-center justify-center transition-colors"
                      title="Cancel schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#292E34]/50 text-xs text-[#9299A3] leading-relaxed">
                  <p className="line-clamp-2">{post.caption}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 text-[11px] text-[#B6F36B]/80 font-mono">
                    {post.hashtags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
