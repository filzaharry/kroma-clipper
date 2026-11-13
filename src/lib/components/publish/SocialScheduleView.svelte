<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import type { SocialPlatform, ScheduledPost } from '#lib/types';
  import {
    Calendar,
    Clock,
    Share2,
    Trash2,
  } from 'lucide-svelte';

  let selectedClipId = $state<string>('');
  let platform = $state<SocialPlatform>('tiktok');
  let scheduledDate = $state<string>('2026-03-26T18:00');
  let caption = $state<string>('');
  let hashtags = $state<string>('#hardware #silicon #engineering #techpodcast');

  const selectedClip = $derived(
    workspace.candidates.find((c) => c.id === selectedClipId) || workspace.activeClip || workspace.candidates[0]
  );

  $effect(() => {
    if (!selectedClipId) {
      const initial = workspace.activeClip || workspace.candidates[0];
      if (initial) {
        selectedClipId = initial.id;
        caption = `${initial.title}: ${initial.excerptQuote.replace(/"/g, '')}`;
      }
    }
  });

  function handleScheduleSubmit(e: SubmitEvent) {
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

    workspace.addScheduledPost(newPost);
  }

  function getPlatformLabel(p: SocialPlatform) {
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
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Title -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
        7. Social Media Publishing & Multi-Channel Scheduler
      </h1>
      <p class="text-xs text-[#9299A3] mt-1">
        Distribute edited highlights across TikTok, YouTube Shorts, Instagram Reels, and LinkedIn with synchronized publishing time slots.
      </p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Scheduler Composer Form -->
    <div class="lg:col-span-1 p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-4">
      <div class="flex items-center gap-2 border-b border-[#292E34] pb-3">
        <Calendar class="w-4 h-4 text-[#B6F36B]" />
        <span class="text-sm font-semibold text-[#E7E9EC]">
          Schedule New Post
        </span>
      </div>

      <form onsubmit={handleScheduleSubmit} class="space-y-4 text-xs">
        <!-- Select Clip -->
        <div>
          <label for="schedule-clip-select" class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
            Select Highlight Clip
          </label>
          <select
            id="schedule-clip-select"
            value={selectedClipId}
            onchange={(e) => {
              selectedClipId = (e.target as HTMLSelectElement).value;
              const found = workspace.candidates.find((c) => c.id === selectedClipId);
              if (found) {
                caption = `${found.title}: ${found.excerptQuote.replace(/"/g, '')}`;
              }
            }}
            class="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] focus:outline-none cursor-pointer"
          >
            {#each workspace.candidates as c (c.id)}
              <option value={c.id}>
                {c.title} ({c.duration}s · Score {c.score})
              </option>
            {/each}
          </select>
        </div>

        <!-- Target Platform Selector -->
        <div>
          <span class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
            Target Platform
          </span>
          <div class="grid grid-cols-2 gap-1.5">
            {#each [
              { id: 'tiktok' as SocialPlatform, label: 'TikTok' },
              { id: 'youtube_shorts' as SocialPlatform, label: 'YouTube Shorts' },
              { id: 'instagram_reels' as SocialPlatform, label: 'Instagram Reels' },
              { id: 'linkedin' as SocialPlatform, label: 'LinkedIn' },
            ] as plat (plat.id)}
              <button
                type="button"
                onclick={() => (platform = plat.id)}
                class="p-2 rounded border text-left transition-colors cursor-pointer {platform === plat.id
                  ? 'bg-[#20242A] border-[#B6F36B] text-[#B6F36B]'
                  : 'bg-[#14171A] border-[#292E34] text-[#9299A3] hover:border-[#383F47]'}"
              >
                {plat.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Date Time Picker -->
        <div>
          <label for="schedule-date-input" class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
            Publishing Date & Time
          </label>
          <input
            id="schedule-date-input"
            type="datetime-local"
            bind:value={scheduledDate}
            class="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] font-mono focus:outline-none"
          />
        </div>

        <!-- Caption Text Area -->
        <div>
          <div class="flex justify-between items-center mb-1">
            <label for="schedule-caption-input" class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider">
              Post Caption Copy
            </label>
            <span class="text-[10px] text-[#626871] font-mono">
              {caption.length} chars
            </span>
          </div>
          <textarea
            id="schedule-caption-input"
            rows="3"
            bind:value={caption}
            class="w-full p-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] leading-relaxed focus:outline-none focus:border-[#B6F36B]"
            placeholder="Write compelling description..."
          ></textarea>
        </div>

        <!-- Hashtags -->
        <div>
          <label for="schedule-hashtags-input" class="text-[11px] font-semibold text-[#626871] uppercase tracking-wider block mb-1">
            Hashtags
          </label>
          <input
            id="schedule-hashtags-input"
            type="text"
            bind:value={hashtags}
            class="w-full h-8 px-2 bg-[#14171A] border border-[#292E34] rounded text-[#E7E9EC] focus:outline-none focus:border-[#B6F36B]"
          />
        </div>

        <button
          type="submit"
          class="w-full h-9 rounded bg-[#B6F36B] hover:bg-[#A5E456] text-[#111315] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6F36B]/50"
        >
          <Clock class="w-3.5 h-3.5" />
          <span>Schedule Cross-Platform Post</span>
        </button>
      </form>
    </div>

    <!-- Scheduled Posts Queue & Calendar Strip -->
    <div class="lg:col-span-2 space-y-4">
      <div class="flex items-center justify-between text-xs font-medium text-[#9299A3] px-1">
        <span>Publishing Schedule ({workspace.scheduledPosts.length})</span>
        <span class="font-mono text-[#626871]">Auto-sync queue active</span>
      </div>

      <div class="space-y-3">
        {#each workspace.scheduledPosts as post (post.id)}
          <div
            class="p-4 rounded-lg bg-[#191C20] border border-[#292E34] hover:border-[#383F47] transition-colors"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded bg-[#14171A] border border-[#292E34] flex items-center justify-center text-[#B6F36B] shrink-0"
                >
                  <Share2 class="w-4 h-4" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-[#B6F36B]">
                      {getPlatformLabel(post.platform)}
                    </span>
                    <span class="text-[11px] text-[#626871]">·</span>
                    <span class="text-xs font-medium text-[#E7E9EC] truncate max-w-[280px]">
                      {post.clipTitle}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-[11px] text-[#9299A3] mt-0.5 font-mono">
                    <Clock class="w-3.5 h-3.5 text-[#626871]" />
                    <span>{new Date(post.scheduledTime).toLocaleString()}</span>
                    <span>·</span>
                    <span>{post.durationSeconds}s</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 self-end sm:self-auto">
                <span
                  class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#20242A] text-[#B6F36B] border border-[#292E34]"
                >
                  {post.status}
                </span>

                <button
                  type="button"
                  onclick={() => workspace.removeScheduledPost(post.id)}
                  class="w-7 h-7 rounded hover:bg-[#20242A] text-[#626871] hover:text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer"
                  title="Cancel schedule"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div class="mt-3 pt-2.5 border-t border-[#292E34]/50 text-xs text-[#9299A3] leading-relaxed">
              <p class="line-clamp-2">{post.caption}</p>
              <div class="flex flex-wrap gap-1.5 mt-1.5 text-[11px] text-[#B6F36B]/80 font-mono">
                {#each post.hashtags as tag (tag)}
                  <span>{tag}</span>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
