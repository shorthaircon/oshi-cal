<script setup>
import { ref, computed } from 'vue'
import { useIdolsStore } from '../stores/idols.js'
import { useEventsStore } from '../stores/events.js'
import IdolForm from '../components/IdolForm.vue'

const store = useIdolsStore()
const eventsStore = useEventsStore()
const mode = ref('list')
const editingId = ref(null)

const editing = computed(() =>
  editingId.value ? store.byId(editingId.value) : null
)

const otherHexes = computed(() =>
  store.idols
    .filter(i => i.id !== editingId.value)
    .map(i => i.color)
)

function startAdd() {
  editingId.value = null
  mode.value = 'add'
}
function startEdit(id) {
  editingId.value = id
  mode.value = 'edit'
}
function cancel() {
  mode.value = 'list'
  editingId.value = null
}
function onSubmit(payload) {
  if (mode.value === 'add') store.add(payload)
  else if (mode.value === 'edit' && editingId.value) store.update(editingId.value, payload)
  cancel()
}
function countFor(idolId) {
  return eventsStore.events.filter(e => e.idolIds.includes(idolId)).length
}
function onDelete(idol) {
  const linked = countFor(idol.id)
  const ok = confirm(`確定刪除「${idol.name}」？\n（已關聯活動：${linked} 場）`)
  if (ok) store.remove(idol.id)
}
</script>

<template>
  <section class="view-idols">
    <header class="page-head">
      <div class="brand-mark">— Devotees Roster —</div>
      <h2 class="t-h2">推し</h2>
      <div v-if="mode === 'list'" class="head-actions">
        <button class="btn-solid" @click="startAdd">+ 新增推し</button>
      </div>
    </header>

    <div v-if="mode === 'list'">
      <p v-if="store.idols.length === 0" class="empty">
        還沒有任何推し。按右上「+ 新增」開始。
      </p>
      <ul v-else class="idol-list">
        <li v-for="idol in store.idols" :key="idol.id" class="idol-row">
          <span class="dot" :style="{ background: idol.color }" />
          <span class="name">{{ idol.name }}</span>
          <span class="count">{{ countFor(idol.id) }} 場</span>
          <span class="hex">{{ idol.color }}</span>
          <button class="btn-ghost" @click="startEdit(idol.id)">編輯</button>
          <button class="btn-ghost danger" @click="onDelete(idol)">刪除</button>
        </li>
      </ul>
    </div>

    <div v-else class="form-stage">
      <div class="form-eyebrow">— {{ mode === 'add' ? 'New' : 'Edit' }} Oshi —</div>
      <h3 class="form-title">{{ mode === 'add' ? '新增推し' : '編輯推し' }}</h3>
      <IdolForm
        :initial="editing"
        :other-hexes="otherHexes"
        @submit="onSubmit"
        @cancel="cancel"
      />
    </div>
  </section>
</template>

<style scoped>
.page-head {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}
.brand-mark {
  font-family: var(--font-nav);
  font-size: .7rem; letter-spacing: .35em;
  text-transform: uppercase;
  color: var(--berry); font-weight: 500;
  margin-bottom: .5rem;
}
.t-h2 {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: var(--ink);
  margin: 0 0 1rem;
}
.head-actions {
  display: flex; gap: .5rem; justify-content: center;
}
.btn-solid {
  background: var(--ink); color: #fff;
  border: 2px solid var(--ink);
  padding: .55rem 1.2rem;
  font-family: var(--font-body);
  font-size: .9rem; font-weight: 500;
  cursor: pointer; border-radius: 6px;
  transition: all .2s;
}
.btn-solid:hover { background: var(--berry); border-color: var(--berry); }

.empty {
  text-align: center;
  color: var(--ink-faint);
  padding: 2rem 0;
  font-family: var(--font-jp);
}

.idol-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column;
  gap: .55rem;
}
.idol-row {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .75rem 1rem;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  transition: transform .15s, box-shadow .15s;
}
.idol-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 86, 143, 0.15);
}
.dot {
  width: 1.4rem; height: 1.4rem;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.15);
}
.name {
  flex: 1;
  font-family: var(--font-jp);
  font-weight: 500;
  color: var(--ink);
}
.count {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  font-size: .8rem;
  color: var(--ink-soft);
}
.hex {
  font-family: var(--font-mono);
  font-size: .75rem;
  color: var(--ink-faint);
}
.btn-ghost {
  padding: .35rem .7rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  color: var(--ink-soft);
  font-family: var(--font-body);
  font-size: .8rem;
  cursor: pointer;
}
.btn-ghost:hover { border-color: var(--ink); color: var(--ink); }
.btn-ghost.danger { border-color: #fca5a5; color: #ef4444; }
.btn-ghost.danger:hover { background: #fff5f5; border-color: #ef4444; }

.form-stage {
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 4px;
  padding: 2rem 1.5rem 1.5rem;
  box-shadow: 0 2px 0 var(--ink), 0 12px 24px rgba(59, 31, 43, 0.08);
  max-width: 480px;
  margin: 0 auto;
}
.form-eyebrow {
  font-family: var(--font-nav);
  font-size: .7rem; letter-spacing: .25em;
  color: var(--berry);
  text-transform: uppercase;
  font-weight: 500;
  text-align: center;
}
.form-title {
  font-family: var(--font-display);
  text-align: center;
  margin: .25rem 0 1.5rem;
  font-size: 1.5rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--ink);
}

@media (max-width: 600px) {
  .idol-row { flex-wrap: wrap; gap: .5rem; }
  .hex { display: none; }
}
</style>
