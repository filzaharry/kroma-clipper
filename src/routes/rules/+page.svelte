<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/analysis');
  });
</script>

<div class="flex-1 flex items-center justify-center bg-[#111315] text-[#9299A3] text-xs">
  Mengarahkan ke Analisis AI...
</div>
