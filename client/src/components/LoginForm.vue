<template>
    <div>
        <div v-if="isAuthenticated">
            Logged in as <em>{{ authName }}</em>
            <form @submit.prevent="logout()">
              <input type="submit" name="logout" value="Logout">
            </form>
        </div>
        <div v-else>
          <button class="login" @click="login">Sign Up/Log in</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { signOut } from 'firebase/auth'
import { myAuth } from 'src/lib/assetdb/myfirebase'
import { useAppStore } from 'src/stores'
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const store = useAppStore()
const router = useRouter()

const isAuthenticated = computed(() => !!store.user)
const authName = computed(() => store.user?.displayName ?? 'User')

function login() {
  void router.push('/login')
}

async function logout() {
  await signOut(myAuth())
  await store.logout()
}
</script>

<style scoped>

</style>
