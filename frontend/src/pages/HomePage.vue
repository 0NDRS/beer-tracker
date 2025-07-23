<template>
  <div class="home-page">
    <h1>🍻 Žebříček pivařů</h1>
    <div v-if="currentSession?.open && currentSession?.name" class="session-name">
      <b>Aktuální várka:</b> {{ currentSession.name }}
    </div>

    <transition-group name="slide" tag="ul">
      <li v-for="(user, idx) in sortedLeaderboard" :key="user.id">
        <span v-if="idx === 0">🥇</span>
        <span v-else-if="idx === 1">🥈</span>
        <span v-else-if="idx === 2">🥉</span>
        <span v-else style="display:inline-block;width:1.5em;"></span>
        {{ user.name }} – {{ user.totalBeer.toFixed(2) }} L
      </li>
    </transition-group>


    <div v-if="!signedInUser" class="user-card">
      <h2>Vyber své jméno</h2>
      <div class="select-wrap">
        <select v-model="userSelectTemp">
          <option disabled value="">Vyber uživatele</option>
          <option v-for="user in leaderboard" :key="user.id" :value="user.id">{{ user.name }}</option>
        </select>
      </div>
      <button class="main-btn" :disabled="!userSelectTemp" @click="signIn">Přihlásit se</button>
    </div>

    <div v-else-if="signedInUser" class="user-card">
      <h2>{{ signedInUser?.name }}</h2>
      <div class="beer-total">🍺 {{ signedInUser?.totalBeer.toFixed(2) }} L</div>
      <button class="main-btn" @click="openTab">Otevřít pivařský panel</button>
    </div>

    <transition name="tab-fade">
      <div v-if="beerTabOpen && signedInUser" class="tab-overlay" @click.self="closeTab">
        <div class="pull-tab">
          <div class="tab-bar">
            <div class="tab-drag"></div>
          </div>
          <button class="tab-close" @click="closeTab">Zavřít</button>
          <h2>{{ signedInUser.name }}</h2>
          <div class="beer-total">🍺 {{ signedInUser.totalBeer.toFixed(2) }} L</div>
        <div class="beer-buttons">
            <button class="beer-btn" @click="addBeer(0.3)" :disabled="!currentSession?.open">+ 0.3 L</button>
            <button class="beer-btn" @click="addBeer(0.4)" :disabled="!currentSession?.open">+ 0.4 L</button>
            <button class="beer-btn" @click="addBeer(0.5)" :disabled="!currentSession?.open">+ 0.5 L</button>
        </div>
                <div v-if="!currentSession?.open" style="color:#ffe066; margin-bottom:1em;">
            Nelze přidávat piva, dokud není otevřená várka.
        </div>
          <button class="signout-btn" @click="signOut">Odhlásit se</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'

type User = {
  id: string;
  name: string;
  totalBeer: number;
};



const API_URL = 'https://beer-tracker-backend.ondrazab2006.workers.dev';
const leaderboard = ref<User[]>([]);

const currentSession = ref<{ open: boolean; name?: string } | null>(null);

const fetchSession = async () => {
  const res = await fetch(`${API_URL}/api/barrel`);
  if (res.ok) {
    currentSession.value = await res.json();
  } else {
    currentSession.value = null;
  }
};

const fetchLeaderboard = async () => {
  const res = await fetch(`${API_URL}/api/leaderboard`);
  leaderboard.value = await res.json();
};

onMounted(async () => {
  await fetchLeaderboard();
  await fetchSession();
});

const sortedLeaderboard = computed(() => {
  if (!currentSession.value || !currentSession.value.open) {
    // Show all users with 0 L if no session is open
    return leaderboard.value.map(u => ({ ...u, totalBeer: 0 }));
  }
  return [...leaderboard.value].sort((a, b) => b.totalBeer - a.totalBeer);
});

const signedInUserId = ref(localStorage.getItem('selectedUserId') || '')
const signedInUser = computed(() => leaderboard.value.find(u => u.id === signedInUserId.value) || null)
const userSelectTemp = ref('')
const beerTabOpen = ref(false)

const signIn = () => {
  if (!userSelectTemp.value) return
  signedInUserId.value = userSelectTemp.value
  localStorage.setItem('selectedUserId', userSelectTemp.value)
  beerTabOpen.value = true
}

const openTab = () => {
  beerTabOpen.value = true
}

const closeTab = () => {
  beerTabOpen.value = false
}

const signOut = () => {
  signedInUserId.value = ''
  userSelectTemp.value = ''
  beerTabOpen.value = false
  localStorage.removeItem('selectedUserId')
}

const addBeer = async (size: number) => {
  if (!signedInUserId.value) return;
  await fetch(`${API_URL}/beer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: signedInUserId.value, amount: size })
  });
  await fetchLeaderboard();
}
</script>

<style scoped>
h1 {
  font-size: 2.1rem;
  margin-bottom: 1.2rem;
  text-align: center;
}
.home-page {
  padding: 1.2rem;
  max-width: 480px;
  margin: 0 auto;
}
ul {
  padding: 0;
  margin: 1rem 0 2rem 0;
  list-style: none;
}
li {
  background: #2b2b2b;
  color: black;
  margin-bottom: 0.5rem;
  padding: 0.7rem 1.2rem;
  border-radius: 1.5rem;
  font-size: 1.2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  display: flex;
  align-items: center;
  gap: 0.7em;
  transition: box-shadow 0.2s;
}
li:nth-child(1) { font-weight: bold; background: #ffcd29; }
li:nth-child(2) { background: #ffe180; }
li:nth-child(3) { background: #ffeba8; }

/* Slide transition for leaderboard */
.slide-move {
  transition: transform 0.4s cubic-bezier(.55,0,.1,1);
}
.slide-enter-active, .slide-leave-active {
  transition: all 0.4s cubic-bezier(.55,0,.1,1);
}
.slide-enter-from {
  opacity: 0;
  transform: translateY(-30px);
}
.slide-leave-to {
  transform: translateY(30px);
  opacity: 0;
}
.user-card {
  background: #2b2b2b;
  border-radius: 1.5rem;
  box-shadow: 0 2px 16px rgba(0,0,0,0.09);
  padding: 2rem 1.2rem 1.5rem 1.2rem;
  margin: 0 auto 1.5rem auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 350px;
}
.tab-overlay {
  position: fixed;
  left: 0; right: 0; bottom: 0; top: 0;
  background: rgba(0,0,0,0.18);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.pull-tab {
  background: #2b2b2b;
  border-radius: 1.5rem 1.5rem 0 0;
  box-shadow: 0 -2px 24px rgba(0,0,0,0.13);
  width: 100vw;
  max-width: 480px;
  padding: 1.2rem 1.2rem 2.2rem 1.2rem;
  min-height: 270px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  animation: tab-slide-up 0.35s cubic-bezier(.55,0,.1,1);
}
.session-name {
  text-align: center;
  font-size: 1.15rem;
  color: #d97706;
  margin-bottom: 0.7rem;
}
.tab-bar {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 0.7rem;
}
.tab-close {
  position: absolute;
  right: 1.2rem;
  top: 1.2rem;
  background: none;
  border: none;
  color: #888;
  font-size: 1.2rem;
  font-weight: 600;
  padding: 0.2rem 0.7rem;
  border-radius: 1rem;
  transition: background 0.2s;
  z-index: 2;
}
.tab-close:hover {
  background: #414141;
}
@keyframes tab-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.tab-fade-enter-active, .tab-fade-leave-active {
  transition: opacity 0.25s;
}
.tab-fade-enter-from, .tab-fade-leave-to {
  opacity: 0;
}
.select-wrap {
  width: 100%;
  margin-bottom: 1.2rem;
}
select {
  width: 100%;
  padding: 0.7rem 1rem;
  border-radius: 1.2rem;
  border: 1px solid #4b4b4b;
  font-size: 1.1rem;
  background: #282828;
  margin-bottom: 0.5rem;
  box-sizing: border-box;
}
.main-btn {
  width: 100%;
  padding: 0.9rem 0;
  border-radius: 1.2rem;
  background: linear-gradient(90deg, #ffe066 60%, #ffd43b 100%);
  color: #222;
  font-weight: 700;
  font-size: 1.15rem;
  border: none;
  margin-top: 0.2rem;
  margin-bottom: 0.2rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  transition: background 0.2s;
}
.main-btn:hover {
  background: #ffd43b;
}
.beer-total {
  font-size: 1.3rem;
  margin: 0.7rem 0 1.2rem 0;
  font-weight: 600;
  color: #d97706;
}
.beer-buttons {
  display: flex;
  gap: 0.7rem;
  margin-bottom: 1.2rem;
}
.beer-btn {
  padding: 2rem 1.2rem;
  border-radius: 1.2rem;
  background: #ffe066;
  color: #0f0f0f;
  font-weight: 600;
  font-size: 1.1rem;
  border: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  transition: background 0.2s;
}
.beer-btn:hover {
  background: #ffd43b;
}
.signout-btn {
  margin-top: 0.7rem;
  color: #d90429;
  background: #fff0f0;
  border: none;
  border-radius: 1.2rem;
  padding: 0.7rem 1.3rem;
  font-weight: 600;
  font-size: 1.05rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  transition: background 0.2s;
}
.signout-btn:hover {
  background: #ffd6d6;
}

@media (max-width: 600px) {
  .home-page {
    padding: 0.5rem;
    font-size: 0.98rem;
  }
  .user-card {
    padding: 1.2rem 0.5rem 1rem 0.5rem;
    max-width: 98vw;
  }
  .beer-buttons {
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
  .beer-btn, .main-btn, .signout-btn {
    width: 100%;
    font-size: 1.05rem;
  }
  select {
    font-size: 0.98rem;
    padding: 0.6rem 0.7rem;
  }
}
</style>
