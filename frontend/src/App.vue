<template>
    <header>
      <h1 class="header-text">🍺 Pivo Tracker</h1>
    </header>
        <Header />

    <main class="p-4">
      <RouterView />
    </main>

    <footer class="text-center text-sm text-gray-500 p-4">
      &copy; {{ new Date().getFullYear() }} Ondrův pivní systém 🍻
    </footer>
</template>

<script setup lang="ts">
import Header from '../src/components/Header.vue';
</script>

<style scoped lang="scss">


header {
  top: 2rem;
}
main {
  padding: 6rem 0 3rem 0;
  height: fit-content;
}
footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #2b2b2b;
  padding: 1rem;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  header {
    position: static;
    top: unset;
    left: unset;
    transform: none;
    text-align: center;
    margin-top: env(safe-area-inset-top, 1.2rem);
    margin-bottom: 0.5rem;
  }
  main {
    padding-top: 2.5rem;
  }
}

</style>
