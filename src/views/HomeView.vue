<script setup>
import { useIdolsStore } from '../stores/idols.js'
const idols = useIdolsStore()
</script>

<template>
  <section class="home">
    <h2>今日</h2>
    <p v-if="idols.idols.length === 0" class="empty">
      還沒追蹤任何偶像。<router-link to="/idols">先去新增第一位偶像</router-link>。
    </p>
    <p v-else class="muted">活動列表開發中…（US-004 / US-010）</p>
  </section>
</template>

<style scoped>
.home { padding: 1rem; }
.empty { padding: 2rem 0; text-align: center; color: #666; }
.muted { color: #888; }
</style>
