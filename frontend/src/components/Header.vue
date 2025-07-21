
<template>
  <nav>
    <ul ref="navList">
      <li v-for="(item, idx) in navItems" :key="item.to" ref="navItemsRefs">
        <router-link
          :to="item.to"
          :class="{ active: isActive(item.to) }"
          @click="setActive(idx)"
        >
          {{ item.icon }}
        </router-link>
      </li>
      <div
        v-if="selectorStyle"
        class="selector-wheel"
        :style="selectorStyle"
      ></div>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

const navItems = [
  { to: '/', icon: '🏠' },
  { to: '/admin', icon: '🛠️' },
];

const navList = ref<HTMLElement | null>(null);
const navItemsRefs = ref([]);
const activeIdx = ref(0);
const route = useRoute();

function isActive(path: string) {
  return route.path === path;
}

function setActive(idx: number) {
  activeIdx.value = idx;
}

const selectorStyle = computed(() => {
  if (!navList.value || !navItemsRefs.value.length) return null;
  const li = navItemsRefs.value[activeIdx.value] as HTMLElement;
  if (!li) return null;
  return {
    left: `${li.offsetLeft + li.offsetWidth / 2 - 30}px`,
    top: `${li.offsetTop + li.offsetHeight / 2 - 30}px`,
  };
});

onMounted(() => {
  // Set initial active index based on route
  const idx = navItems.findIndex(item => item.to === route.path);
  if (idx !== -1) activeIdx.value = idx;
});

watch(() => route.path, (newPath) => {
  const idx = navItems.findIndex(item => item.to === newPath);
  if (idx !== -1) activeIdx.value = idx;
});
</script>

<style scoped lang="scss">
nav {
  position: fixed;
  bottom: 2rem;
  right: 50%;
  transform: translateX(50%);
  background-color: #f1f1f1;
  color: black;
  display: flex;
  justify-content: center;

  width: 120px;
  border-radius: 3rem;
  z-index: 10;

  ul {
    position: relative;
    list-style: none;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    min-width: 180px;
    min-height: 56px;
  }

  .selector-wheel {
    position: absolute;
    width: 60px;
    height: 60px;
    background: #ffe066;
    border-radius: 50%;
    z-index: 0;
    transition: left 0.3s, top 0.3s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    pointer-events: none;
  }

  li {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  a {
    color: black;
    text-decoration: none;
    font-size: 1.8rem;
    position: relative;
    z-index: 2;
    transition: color 0.2s;
  }
  a.active {
    color: #d97706;
    font-weight: bold;
  }
}
</style>