<script lang="ts">
  import { workspace } from '#lib/state/workspace.svelte';
  import { goto } from '$app/navigation';
  import {
    Cpu,
    CheckCircle2,
    ArrowRight,
    Activity,
    Volume2,
    Sparkles,
    UserCheck,
    Layers,
    Play,
    SquarePlay,
    Scissors,
    Download,
    RotateCcw,
  } from 'lucide-svelte';

  const rules = $derived(workspace.rules);
  const detectedClipsCount = $derived(workspace.candidates.length);

  const steps = $derived([
    {
      title: 'Ekstraksi Trek Audio & Vokal',
      desc: 'Menyaring frekuensi vokal dan dinamika volume untuk mendeteksi bagian bersuara',
      icon: Volume2,
      doneThreshold: 20,
    },
    {
      title: 'Deteksi Jeda & Pergantian Pembicara',
      desc: rules.detectSpeakerSwitches
        ? 'Memisahkan pembicara dan menghitung tempo jeda bicara'
        : 'Pemindaian tempo pembicara tunggal',
      icon: UserCheck,
      doneThreshold: 45,
    },
    {
      title: 'Skoring Hook Pembuka (3-5 Detik)',
      desc: `Mengevaluasi kalimat pertanyaan & kata kunci emosional (sensitivitas ${rules.hookSensitivity}%)`,
      icon: Sparkles,
      doneThreshold: 75,
    },
    {
      title: 'Pembentukan Crop 9:16 & Subtitle',
      desc: `Mempersiapkan rasio ${rules.targetAspectRatios.join(', ')} dan sinkronisasi teks kata-per-kata`,
      icon: Layers,
      doneThreshold: 98,
    },
  ]);

  function handleGoToCandidates() {
    goto('/candidates');
  }

  function handleOpenFirstClipEditor() {
    if (workspace.candidates.length > 0) {
      workspace.selectClip(workspace.candidates[0]);
      goto(`/editor?clipId=${workspace.candidates[0].id}`);
    }
  }

  // Otomatis jalankan analisis saat halaman dibuka jika belum dianalisis
  $effect(() => {
    if (
      workspace.activeVideo &&
      !workspace.isAnalyzing &&
      workspace.analysisProgress === 0 &&
      workspace.candidates.length === 0
    ) {
      workspace.runAnalysis();
    }
  });
</script>

<div class="flex-1 flex flex-col overflow-y-auto bg-[#111315] p-6 lg:p-8">
  <!-- Header -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold text-[#E7E9EC] tracking-tight">
        2. Analisis AI & Deteksi Hook
      </h1>
      <p class="text-xs text-[#9299A3] mt-1">
        Memindai video berdasarkan batas durasi ({rules.minDuration}d – {rules.maxDuration}d), dinamika energi vokal, dan kalimat pembuka viral.
      </p>
    </div>

    <div class="flex items-center gap-2">
      {#if detectedClipsCount > 0 && !workspace.isAnalyzing}
        <button
          type="button"
          onclick={handleGoToCandidates}
          class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span>👉 Lanjut ke Pilihan Klip ({detectedClipsCount})</span>
          <ArrowRight class="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      {/if}

      {#if workspace.activeVideo && !workspace.isAnalyzing}
        <button
          type="button"
          onclick={() => workspace.runAnalysis()}
          class="h-9 px-3 text-xs font-medium text-[#9299A3] hover:text-[#E7E9EC] bg-[#191C20] hover:bg-[#20242A] border border-[#292E34] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Jalankan ulang analisis video"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Analisis Ulang</span>
        </button>
      {/if}
    </div>
  </div>

  {#if !workspace.activeVideo}
    <!-- Empty State: Belum ada video yang dimasukkan -->
    <div class="rounded-xl border border-dashed border-[#292E34] p-12 text-center bg-[#14171A] max-w-2xl">
      <div class="w-14 h-14 rounded-full bg-[#191C20] border border-[#292E34] flex items-center justify-center mx-auto mb-4 text-[#B6F36B]">
        <Cpu class="w-7 h-7" />
      </div>
      <h3 class="text-sm font-semibold text-[#E7E9EC]">Menunggu Input Video YouTube</h3>
      <p class="text-xs text-[#9299A3] mt-1.5 max-w-md mx-auto leading-relaxed">
        Anda belum memasukkan video YouTube. Silakan buka menu <strong>Input Video YouTube</strong> untuk memasukkan link video yang ingin dianalisis.
      </p>
      <div class="mt-5">
        <button
          type="button"
          onclick={() => goto('/library')}
          class="h-9 px-4 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <SquarePlay class="w-4 h-4" />
          <span>Masukkan Link YouTube Sekarang</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  {:else}
    <!-- Main Analysis Container -->
    <div class="max-w-4xl space-y-6">
      <!-- SUCCESS BANNER: Muncul saat klip berhasil dipotong -->
      {#if detectedClipsCount > 0 && !workspace.isAnalyzing}
        <div class="p-6 rounded-xl bg-gradient-to-r from-[#172214] via-[#191C20] to-[#191C20] border-2 border-[#B6F36B] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-[#B6F36B]/20 border border-[#B6F36B] flex items-center justify-center text-[#B6F36B] shrink-0 mt-0.5">
              <CheckCircle2 class="w-7 h-7" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-base font-bold text-[#E7E9EC]">
                  🎉 {detectedClipsCount} Klip Viral Berhasil Dipotong & Siap!
                </span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-[#B6F36B]/20 text-[#B6F36B] font-semibold border border-[#B6F36B]/40">
                  SIAP UNDUH
                </span>
              </div>
              <p class="text-xs text-[#9299A3] mt-1.5 max-w-xl leading-relaxed">
                Video <strong class="text-[#E7E9EC]">"{workspace.activeVideo.title}"</strong> telah dipotong menjadi {detectedClipsCount} bagian terbaik dengan skor retensi tinggi, lengkap dengan transkrip kata-per-kata dan format vertikal 9:16.
              </p>
              <div class="mt-2 text-xs text-[#B6F36B] font-medium flex items-center gap-1.5">
                <span>✓ Klip bisa langsung diunduh (MP4) atau ditonton preview-nya terlebih dahulu.</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              type="button"
              onclick={handleGoToCandidates}
              class="h-11 px-5 text-xs font-bold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] active:bg-[#94D445] rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <span>👉 Lanjut ke Pilihan Klip & Unduh</span>
              <ArrowRight class="w-4 h-4 stroke-[2.4]" />
            </button>
            <button
              type="button"
              onclick={handleOpenFirstClipEditor}
              class="h-11 px-4 text-xs font-medium text-[#E7E9EC] bg-[#20242A] hover:bg-[#292E34] border border-[#292E34] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Scissors class="w-3.5 h-3.5 text-[#B6F36B]" />
              <span>Preview di Editor</span>
            </button>
          </div>
        </div>
      {/if}

      <!-- FALLBACK RECOVERY BANNER: Jika sebelumnya 0 klip terdeteksi -->
      {#if !workspace.isAnalyzing && workspace.analysisProgress === 100 && detectedClipsCount === 0}
        <div class="p-6 rounded-xl bg-[#221B14] border border-[#F59E0B] flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div class="flex items-start gap-3.5">
            <div class="w-11 h-11 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/50 flex items-center justify-center text-[#F59E0B] shrink-0 mt-0.5">
              <Sparkles class="w-6 h-6" />
            </div>
            <div>
              <div class="text-sm font-bold text-[#E7E9EC]">
                Langkah Selanjutnya: Potong Klip Otomatis (Mode Fleksibel)
              </div>
              <p class="text-xs text-[#9299A3] mt-1 max-w-xl leading-relaxed">
                Pemindaian sebelumnya menggunakan ambang batas suara yang terlalu ketat. Sistem kini telah mengaktifkan mode penyesuaian otomatis agar 5 klip terbaik langsung dipotong sesuai durasi yang diinginkan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onclick={() => workspace.runAnalysis()}
            class="h-11 px-6 text-xs font-bold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0 w-full md:w-auto"
          >
            <Play class="w-4 h-4 fill-current" />
            <span>⚡ Potong 5 Klip Sekarang (Klik Di Sini)</span>
          </button>
        </div>
      {/if}

      <!-- Ready state banner if not started yet -->
      {#if !workspace.isAnalyzing && workspace.analysisProgress === 0}
        <div class="p-6 rounded-lg bg-[#191C20] border border-[#292E34] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="text-sm font-semibold text-[#E7E9EC]">
              Video Siap Dianalisis: {workspace.activeVideo.title}
            </div>
            <p class="text-xs text-[#9299A3] mt-1">
              Klik tombol di samping untuk memulai pemindaian hook dan pemotongan klip otomatis sesuai aturan durasi {rules.minDuration}s - {rules.maxDuration}s.
            </p>
          </div>
          <button
            type="button"
            onclick={() => workspace.runAnalysis()}
            class="h-10 px-5 text-xs font-semibold text-[#111315] bg-[#B6F36B] hover:bg-[#A5E456] rounded transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Play class="w-4 h-4 fill-current" />
            <span>Mulai Analisis AI Sekarang</span>
          </button>
        </div>
      {/if}

      <!-- Progress Card -->
      <div class="p-6 rounded-lg bg-[#191C20] border border-[#292E34] space-y-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 rounded bg-[#20242A] border border-[#292E34] flex items-center justify-center text-[#B6F36B]"
            >
              <Cpu class="w-5 h-5 {workspace.isAnalyzing ? 'animate-spin' : ''}" />
            </div>
            <div>
              <div class="text-sm font-semibold text-[#E7E9EC]">
                {workspace.isAnalyzing ? 'Sedang Menganalisis Klip...' : workspace.analysisProgress === 100 ? 'Analisis Selesai' : 'Siap Dianalisis'}
              </div>
              <div class="text-xs text-[#9299A3]">
                {workspace.activeVideo.title}
              </div>
            </div>
          </div>

          <div class="text-right">
            <div class="text-lg font-mono tabular-nums font-semibold text-[#B6F36B]">
              {workspace.analysisProgress}%
            </div>
            <div class="text-[10px] text-[#626871] font-mono">
              {workspace.isAnalyzing ? 'STATUS: MEMPROSES' : workspace.analysisProgress === 100 ? 'SELESAI' : 'MENUNGGU'}
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full h-2 bg-[#20242A] rounded-full overflow-hidden">
          <div
            class="h-full bg-[#B6F36B] transition-all duration-300"
            style="width: {workspace.analysisProgress}%"
          ></div>
        </div>

        <!-- Pipeline Steps -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {#each steps as st, i (st.title)}
            {@const isDone = workspace.analysisProgress >= st.doneThreshold}
            {@const isCurrent =
              workspace.analysisProgress < st.doneThreshold &&
              (i === 0 || workspace.analysisProgress >= steps[i - 1].doneThreshold)}
            {@const StepIcon = st.icon}
            <div
              class="p-3.5 rounded border transition-colors {isDone
                ? 'bg-[#20242A]/60 border-[#292E34]'
                : isCurrent
                  ? 'bg-[#191C20] border-[#B6F36B]/50 ring-1 ring-[#B6F36B]/30'
                  : 'bg-[#14171A] border-[#292E34]/50 opacity-60'}"
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5 {isDone
                    ? 'bg-[#B6F36B]/10 text-[#B6F36B]'
                    : isCurrent
                      ? 'bg-[#20242A] text-[#B6F36B]'
                      : 'bg-[#20242A] text-[#626871]'}"
                >
                  {#if isDone}
                    <CheckCircle2 class="w-4 h-4" />
                  {:else}
                    <StepIcon class="w-4 h-4" />
                  {/if}
                </div>
                <div>
                  <div class="text-xs font-semibold text-[#E7E9EC]">{st.title}</div>
                  <div class="text-[11px] text-[#9299A3] mt-0.5 leading-relaxed">{st.desc}</div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Real-time Discovery Log / Inspection -->
      <div class="p-5 rounded-lg bg-[#191C20] border border-[#292E34] space-y-3">
        <div class="flex items-center justify-between text-xs font-medium text-[#9299A3]">
          <div class="flex items-center gap-2">
            <Activity class="w-3.5 h-3.5 text-[#B6F36B]" />
            <span>Catatan Aktivitas Mesin Analisis</span>
          </div>
          <span class="font-mono text-[#626871]">{detectedClipsCount} klip teridentifikasi</span>
        </div>

        <div
          class="bg-[#111315] p-3 rounded border border-[#292E34] font-mono text-[11px] text-[#9299A3] space-y-1.5 h-48 overflow-y-auto"
        >
          {#if workspace.analysisLogs.length === 0}
            <div class="text-[#626871] py-8 text-center font-sans text-xs">
              Belum ada log. Klik "Mulai Analisis AI Sekarang" untuk memulai pemindaian video.
            </div>
          {:else}
            {#each workspace.analysisLogs as log, idx (idx)}
              <div
                class={log.includes('selesai') || log.includes('Berhasil') || log.includes('tertinggi')
                  ? 'text-[#B6F36B]'
                  : log.includes('Catatan')
                    ? 'text-[#F59E0B]'
                    : 'text-[#E7E9EC]'}
              >
                {log}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
