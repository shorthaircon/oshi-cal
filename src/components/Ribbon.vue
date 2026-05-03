<script setup>
defineProps({
  color: { type: String, default: 'berry' }, // 'berry' | 'lavender' | 'gold' | 'ink'
})
</script>

<template>
  <span class="ribbon" :class="`ribbon-${color}`">
    <slot />
  </span>
</template>

<style scoped>
.ribbon {
  display: inline-block;
  padding: .35rem 1.5rem;
  background: var(--berry);
  color: #fff;
  font-family: var(--font-nav);
  font-size: .7rem;
  letter-spacing: .2em;
  text-transform: uppercase;
  font-weight: 500;
  white-space: nowrap;
  clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0 50%);
}
.ribbon-lavender { background: var(--lavender); }
.ribbon-gold { background: var(--gold); }
.ribbon-ink { background: var(--ink); }
</style>
