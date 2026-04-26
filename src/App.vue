<script setup>
</script>

<template>
  <div class="app">
    <header class="topbar">
      <router-link to="/" class="brand">oshi-cal</router-link>
      <nav>
        <router-link to="/">今日</router-link>
        <router-link to="/events">活動</router-link>
        <router-link to="/idols">偶像</router-link>
        <router-link to="/settings">設定</router-link>
      </nav>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app { max-width: 720px; margin: 0 auto; }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: .75rem 1rem; border-bottom: 1px solid #eee;
}
.brand { font-weight: 700; font-size: 1.1rem; text-decoration: none; color: #111; }
nav { display: flex; gap: 1rem; }
nav a { text-decoration: none; color: #666; }
nav a.router-link-active { color: #111; font-weight: 600; }
</style>
