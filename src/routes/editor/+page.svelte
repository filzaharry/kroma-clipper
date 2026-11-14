<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { page } from '$app/state';
  import ClipEditorView from '#lib/components/editor/ClipEditorView.svelte';
  import { Scissors, ArrowRight, SquarePlay } from 'lucide-svelte';

  $effect(() => {
    const clipId = page.url.searchParams.get('clipId');
    if (clipId) {
      const found = workspace.candidates.find((c) => c.id === clipId);
      if (found) {
        workspace.selectClip(found);
      }
    }
  });

  const clip = $derived(workspace.activeClip);
</script>

{#if clip}
  <ClipEditorView {clip} />
{:else}
  <div class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#111315]">
    <div class="w-14 h-14 rounded-full bg-[#191C20] border border-[#292E34] flex items-center justify-center mb-4 text-[#B6F36B]">
      <Scissors class="w-7 h-7" />
    </div>
    <div class="text-sm font-semibold text-[#E7E9EC] mb-1">Belum Ada Klip yang Dipilih</div>
    <p class="text-xs text-[#9299A3] mb-5 max-w-md">
      {#if workspace.candidates.length === 0}
        Masukkan link video YouTube di menu awal, lalu jalankan analisis AI untuk membuat potongan klip.
      {:else}
        Pilih salah satu klip dari daftar Pilihan Klip untuk mulai mengedit teks subtitle, watermark, dan framing video.
      {/if}
    </p>
    <a
      href={workspace.candidates.length === 0 ? '/library' : '/candidates'}
      class="h-9 px-5 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors inline-flex items-center gap-2 cursor-pointer"
    >
      {#if workspace.candidates.length === 0}
        <SquarePlay class="w-4 h-4" />
        <span>Masukkan Link YouTube</span>
      {:else}
        <Scissors class="w-4 h-4" />
        <span>Buka Pilihan Klip</span>
      {/if}
      <ArrowRight class="w-3.5 h-3.5" />
    </a>
  </div>
{/if}
