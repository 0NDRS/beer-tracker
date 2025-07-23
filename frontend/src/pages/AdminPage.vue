// Helper for starting a barrel session (used by confirmStartBarrelSession)


<template>
  <div class="admin-page">
    <h1>Admin Panel</h1>

    <section>
      <h2>Barrel Session</h2>
      <label>Název várky:</label>
      <input v-model="barrel.name" placeholder="Název várky" />
      <label>Kupující:</label>
      <select v-model="barrel.buyer">
        <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
      </select>
      <label>Cena (Kč):</label>
      <input type="number" v-model.number="barrel.price" />
      <label>Objem (litry):</label>
      <input type="number" v-model.number="barrel.volume" />
      <button @click="confirmStartBarrelSession" :disabled="currentSession && currentSession.open">Spustit novou várku</button>
      <button @click="closeSession" :disabled="!currentSession || !currentSession.open">Ukončit várku</button>
      <div v-if="barrelStartMessage" class="barrel-confirm">{{ barrelStartMessage }}</div>
    </section>

    <section>
      <h2>Celkové dluhy</h2>
      <div v-if="sessionHistory.length === 0"><i>Žádné várky k vyhodnocení.</i></div>
      <ul>
        <li v-for="user in users" :key="user.id">
          <b>{{ user.name }}</b>:
          <span class="debt">
            {{ Math.floor(overallDebt(user.id)) }} Kč
          </span>
          <span v-if="overallPaid(user.id) > 0" class="paid">(zaplaceno: {{ Math.floor(overallPaid(user.id)) }} Kč)</span>
        </li>
      </ul>
    </section>

    <section>
      <h2>Historie várek</h2>
      <div v-if="sessionHistory.length === 0"><i>Žádné ukončené várky.</i></div>
      <div v-for="session in sessionHistory" :key="session.closedAt" class="barrel-history" :class="{'barrel-opened': session.open}">
        <div class="barrel-summary" @click="toggleSession(session.closedAt)">
          <span class="barrel-date">
            {{
              new Date(session.closedAt).toLocaleString('cs-CZ', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })
            }}
          </span>
          <span class="barrel-name" v-if="session.name">Várka: <b>{{ session.name }}</b></span>
          <span class="barrel-buyer">Kupující: <b>{{ userName(session.buyer) }}</b></span>
          <span class="barrel-price">Cena: <b>{{ Math.floor(session.price) }} Kč</b></span>
          <span class="barrel-volume">Objem: <b>{{ (session.volume) }} L</b></span>
          <span class="barrel-status" v-if="session.open">🟢 Otevřená</span>
          <span class="barrel-arrow">{{ expandedSessions.includes(session.closedAt+'') ? '▲' : '▼' }}</span>
        </div>
        <div v-if="expandedSessions.includes(session.closedAt+'')" class="barrel-details">
          <div><b>Cena za litr:</b> {{ Math.floor(session.pricePerL) }} Kč</div>
          <div><b>Dluhy:</b></div>
          <ul>
              <li v-for="(debt, uid) in session.userOwes" :key="uid.toString()">
              <b>{{ userName(uid.toString()) }}</b>: <span class="debt">{{ Math.floor(debt) }} Kč</span> <span class="drank">(vypito: {{ (session.consumed[uid] || 0) }} L)</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section>
      <h2>Uživatelé</h2>
      <ul>
        <li v-for="user in users" :key="user.id" class="user-item">
          {{ user.name }}
          <button @click="deleteUser(user.id)">❌</button>
        </li>
      </ul>
      <input v-model="newUserName" placeholder="Nový uživatel" />
      <button @click="addUser">Přidat</button>
    </section>

    <section style="margin-bottom: 3rem;">
      <h2>Piva (ručně)</h2>
      <div v-if="!currentSession || !currentSession.open" style="color:#ffe066; margin-bottom:1em;">
        Nelze přidávat piva, dokud není otevřená várka.
      </div>
      <div v-else>
        <select v-model="manualUserId">
          <option disabled value="">Vyber uživatele</option>
          <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
        </select>
        <select v-model="manualBeerAction">
          <option value="add">Přidat pivo</option>
          <option value="delete">Odebrat pivo</option>
        </select>
        <input v-model="manualBeerCodes" placeholder="Zadej piva (L=0.5, O=0.4, X=0.3, např. LLXOX)" />
        <button @click="addBeerManually">Provést akci</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

type User = { id: string; name: string; totalBeer: number }

const API_BASE = "https://beer-tracker-backend.ondrazab2006.workers.dev";

const users = ref<User[]>([]);

const fetchUsers = async () => {
  const res = await fetch(`${API_BASE}/api/users`);
  users.value = await res.json();
};

const barrel = ref({ name: '', buyer: '', price: 0, volume: 30 })
const currentSession = ref<any>(null)
const sessionHistory = ref<any[]>([])
const expandedSessions = ref<string[]>([])

const fetchBarrelSession = async () => {
  const res = await fetch(`${API_BASE}/api/barrel`)
  currentSession.value = await res.json()
}
const fetchBarrelHistory = async () => {
  const res = await fetch(`${API_BASE}/api/barrel/history`)
  let history = await res.json()
  // Remove duplicate open session if present
  if (history.length > 1 && history[0].open && history[1].open &&
      history[0].buyer === history[1].buyer &&
      history[0].price === history[1].price &&
      history[0].volume === history[1].volume) {
    history = history.slice(1)
  }
  sessionHistory.value = history
}
const startBarrelSession = async () => {
  await fetch(`${API_BASE}/api/barrel/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(barrel.value)
  })
  await fetchBarrelSession()
  await fetchBarrelHistory()
}

const overallDebt = (userId: string) => {
  let debt = 0;
  sessionHistory.value.forEach(session => {
    if (session.userOwes && session.userOwes[userId]) {
      debt += session.userOwes[userId];
    }
    if (session.buyer === userId && session.price) {
      debt -= session.price;
    }
  });
  return debt;
}

const overallPaid = (userId: string) => {
  let paid = 0;
  sessionHistory.value.forEach(session => {
    if (session.buyer === userId && session.price) {
      paid += session.price;
    }
  });
  return paid;
}

const manualBeerCodes = ref('')

function parseBeerCodes(codes: string): number {
  let total = 0;
  for (const char of codes.toUpperCase()) {
    if (char === 'L') total += 0.5;
    if (char === 'O') total += 0.4;
    if (char === 'X') total += 0.3;
  }
  return total;
}

const addBeerManually = async () => {
  if (!manualUserId.value || !manualBeerCodes.value) return;
  const amount = manualBeerAction.value === 'add'
    ? parseBeerCodes(manualBeerCodes.value)
    : -parseBeerCodes(manualBeerCodes.value);
  if (!amount) return;
  await fetch(`${API_BASE}/beer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: manualUserId.value, amount })
  });
  manualBeerCodes.value = '';
  await fetchUsers();
};

onMounted(() => {
  fetchUsers()
  fetchBarrelSession()
  fetchBarrelHistory()
})

const newUserName = ref('')
const manualUserId = ref('')
const manualBeerAction = ref('add')
const addUser = async () => {
  if (!newUserName.value) return;
  await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newUserName.value })
  });
  newUserName.value = '';
  await fetchUsers();
}

const deleteUser = async (id: string) => {
  await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE' });
  await fetchUsers();
}


const barrelStartMessage = ref('')
const confirmStartBarrelSession = async () => {
  if (currentSession.value && currentSession.value.open) {
    barrelStartMessage.value = 'Nelze spustit novou várku, dokud je předchozí otevřená.'
    setTimeout(() => barrelStartMessage.value = '', 3000)
    return
  }
  if (!barrel.value.buyer || !barrel.value.price || !barrel.value.volume) {
    barrelStartMessage.value = 'Vyplňte všechny údaje pro várku.'
    setTimeout(() => barrelStartMessage.value = '', 3000)
    return
  }
  if (!confirm(`Opravdu chcete spustit novou várku?\nKupující: ${userName(barrel.value.buyer)}, Cena: ${barrel.value.price} Kč, Objem: ${barrel.value.volume} L`)) return
  await startBarrelSession()
  barrelStartMessage.value = 'Nová várka byla spuštěna!'
  setTimeout(() => barrelStartMessage.value = '', 3000)
}

const closeSession = async () => {
  await fetch(`${API_BASE}/api/barrel/close`, { method: 'POST' })
  await fetchBarrelSession()
  await fetchBarrelHistory()
  await fetchUsers()
}

function userName(id: string) {
  const u = users.value.find(u => u.id === id)
  return u ? u.name : id
}

function toggleSession(closedAt: number) {
  const key = closedAt.toString();
  if (expandedSessions.value.includes(key)) {
    expandedSessions.value = expandedSessions.value.filter(x => x !== key)
  } else {
    expandedSessions.value.push(key)
  }
}
</script>

<style scoped lang="scss">
.admin-page {
  padding: 1.2rem;
  max-width: 480px;
  margin: 0 auto;
  font-size: 1.05rem;
}
section {
  margin-top: 1.5rem;
  background: #323232;
  border-radius: 1.2rem;
  padding: 1rem 1.2rem 1.2rem 1.2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
label {
  display: block;
  margin-top: 0.7rem;
  margin-bottom: 0.2rem;
  font-weight: 500;
}
input, select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  margin-bottom: 0.7rem;
  border-radius: 0.7rem;
  border: 1px solid #d1d5db;
  font-size: 1rem;
  box-sizing: border-box;
}
button {
  margin-top: 0.5rem;
  margin-right: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 1.2rem;
  border: none;
  background: #ffe066;
  color: #222;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  transition: background 0.2s;
}
button:hover {
  background: #ffd43b;
}
ul {
  padding: 0;
  margin: 0 0 1rem 0;
  list-style: none;
}
li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.2rem;
  font-size: 1.05rem;
}
.user-item {
  border: 1px solid #d1d5db;
  border-radius: 1.2rem;
  padding: 0;
  margin-bottom: .5rem;

  padding-left: 1rem;

  button {
    margin: 0;
  }
}
.barrel-history {
  margin-top: 0.7rem;
  padding: 0.7rem 1rem;
  background: linear-gradient(90deg, #232323 80%, #2b2b2b 100%);
  border-radius: 1rem;
  border: 1px solid #444;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  margin-bottom: 1.1rem;
}
.barrel-history.barrel-opened {
  border: 2px solid #ffe066;
  background: linear-gradient(90deg, #2b2b2b 60%, #4b4b4b 100%);
}
.barrel-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  align-items: center;
  font-weight: 500;
  padding: 0.4rem 0;
  font-size: 1.08rem;
}
.barrel-date { color: #ffe066; font-weight: bold; }
.barrel-buyer { color: #ffd43b; }
.barrel-price { color: #e0e0e0; }
.barrel-volume { color: #bdbdbd; }
.barrel-status { color: #4caf50; font-weight: bold; margin-left: 0.7rem; }
.barrel-arrow { margin-left: auto; color: #ffe066; font-size: 1.2em; }
.barrel-details {
  padding: 0.4rem 0 0 0;
  border-top: 1px solid #444;
  margin-top: 0.4rem;
  font-size: 1.01rem;
}
.debt { color: #ffe066; font-weight: 600; }
.drank { color: #bdbdbd; }
.paid { color: #4caf50; font-weight: 500; margin-left: 0.7em; }
.barrel-confirm {
  margin-top: 0.7rem;
  color: #ffe066;
  font-weight: 600;
  font-size: 1.08rem;
}
@media (max-width: 600px) {
  .admin-page {
    padding: 0.5rem;
    font-size: 0.98rem;
  }
  section {
    padding: 0.7rem 0.5rem 1rem 0.5rem;
    margin-top: 1rem;
  }
  button {
    padding: 0.5rem 0.8rem;
    font-size: 0.98rem;
  }
  input, select {
    padding: 0.5rem 0.6rem;
    font-size: 0.98rem;
  }
  li {
    font-size: 0.98rem;
  }
}
</style>
