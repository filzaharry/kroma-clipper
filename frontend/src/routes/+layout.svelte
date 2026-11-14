<script lang="ts">
  import '../index.css';
  import Header from '#lib/components/layout/Header.svelte';
  import Sidebar from '#lib/components/layout/Sidebar.svelte';

  let { children } = $props();
</script>

<div class="flex flex-col h-screen w-screen overflow-hidden bg-[#111315] text-[#E7E9EC]">
  <!-- Strict 3-zone Header -->
  <Header />

  <!-- Main Workspace: Docked Sidebar + Active Viewport -->
  <div class="flex-1 flex overflow-hidden">
    <!-- DaVinci / Linear Inspired Sidebar -->
    <Sidebar />

    <!-- Active Route Viewport -->
    <main class="flex-1 flex flex-col overflow-hidden bg-[#111315] relative">
      {@render children()}
    </main>
  </div>
</div>
