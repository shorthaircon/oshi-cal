<script setup>
import { ref, computed } from 'vue'
import { useIdolsStore } from '../stores/idols.js'
import IdolForm from '../components/IdolForm.vue'

const store = useIdolsStore()
const mode = ref('list') // 'list' | 'add' | 'edit'
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
function onDelete(idol) {
  // MVP: events 還沒實作，關聯數量先顯示 0
  const linked = 0
  const ok = confirm(`確定刪除「${idol.name}」？\n（已關聯活動：${linked} 場）`)
  if (ok) store.remove(idol.id)
}
</script>

<template>
  <section class="idols">
    <header class="head">
      <h2>偶像</h2>
      <button v-if="mode === 'list'" class="add-btn" @click="startAdd">+ 新增</button>
    </header>

    <div v-if="mode === 'list'">
      <p v-if="store.idols.length === 0" class="empty">
        還沒有任何偶像，按右上「+ 新增」開始。
      </p>
      <ul v-else class="list">
        <li v-for="idol in store.idols" :key="idol.id" class="item">
          <span class="dot" :style="{ background: idol.color }" />
          <span class="name">{{ idol.name }}</span>
          <span class="hex">{{ idol.color }}</span>
          <button class="ghost" @click="startEdit(idol.id)">編輯</button>
          <button class="danger" @click="onDelete(idol)">刪除</button>
        </li>
      </ul>
    </div>

    <div v-else class="form-wrap">
      <h3>{{ mode === 'add' ? '新增偶像' : '編輯偶像' }}</h3>
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
.idols { padding: 1rem; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.head h2 { margin: 0; }
.add-btn {
  padding: .4rem .8rem; border: none; border-radius: 6px;
  background: #111; color: #fff; cursor: pointer; font-size: .9rem;
}
.empty { padding: 2rem 0; text-align: center; color: #888; }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .5rem; }
.item {
  display: flex; align-items: center; gap: .75rem;
  padding: .6rem .75rem; background: #fafafa;
  border: 1px solid #eee; border-radius: 8px;
}
.dot { width: 1.4rem; height: 1.4rem; border-radius: 50%; flex-shrink: 0; }
.name { flex: 1; font-weight: 500; }
.hex { font-family: monospace; font-size: .8rem; color: #888; }
.item button {
  padding: .3rem .6rem; border: 1px solid #ccc; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: .8rem;
}
.item button.danger { border-color: #ef4444; color: #ef4444; }
.form-wrap { max-width: 480px; }
.form-wrap h3 { margin-top: 0; }
</style>
