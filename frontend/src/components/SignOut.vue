<template>
  <button @click="signOut">Odhlásit se</button>
</template>

<script setup lang="ts">
function signOut() {
  localStorage.removeItem("user")
  window.location.href = "/"
}
</script>
