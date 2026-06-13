<template>
  <div v-if="user" class="text-center q-pa-md">
    <div class="q-mb-md">Hello, {{ user.displayName || user.email }}</div>
    <q-btn color="primary" @click="logout">Logout</q-btn>
  </div>

  <q-card v-else flat bordered class="login-card q-pa-sm" style="min-width: 340px; max-width: 420px; margin: auto;">
    <q-card-section>
      <div class="text-h6 text-center q-mb-lg">{{ isSignUp ? 'Create Account' : 'Sign In' }}</div>

      <q-btn
        outline
        class="full-width q-mb-md"
        :loading="googleLoading"
        @click="signInWithGoogle"
      >
        <svg class="q-mr-sm" width="18" height="18" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.1c-.6 3-2.3 5.5-5 7.2v6h8.1c4.7-4.4 7.3-10.8 7.3-17.3z"/>
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-8.1-6c-2.1 1.4-4.7 2.2-7.8 2.2-6 0-11.1-4-12.9-9.4H2.8v6.2C6.8 42.7 14.8 48 24 48z"/>
          <path fill="#FBBC05" d="M11.1 29c-.5-1.4-.7-2.9-.7-4.5s.2-3.1.7-4.5v-6.2H2.8C1 17.4 0 20.6 0 24s1 6.6 2.8 9.2l8.3-6.2z"/>
          <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.4l6.5-6.5C35.9 2.6 30.4 0 24 0 14.8 0 6.8 5.3 2.8 14.8l8.3 6.2C12.9 15.5 18 11.5 24 9.5 24 9.5 24 9.5 24 9.5z"/>
        </svg>
        Continue with Google
      </q-btn>

      <div class="row items-center q-mb-md">
        <div class="col"><q-separator /></div>
        <div class="col-auto q-px-sm text-grey-6 text-caption">or</div>
        <div class="col"><q-separator /></div>
      </div>

      <q-input
        v-model="email"
        type="email"
        label="Email"
        outlined
        dense
        class="q-mb-sm"
        autocomplete="email"
        @keyup.enter="submitForm"
      />
      <q-input
        v-model="password"
        :type="showPassword ? 'text' : 'password'"
        label="Password"
        outlined
        dense
        class="q-mb-xs"
        :autocomplete="isSignUp ? 'new-password' : 'current-password'"
        :error="!!errorMsg"
        :error-message="errorMsg"
        @keyup.enter="submitForm"
      >
        <template #append>
          <q-icon
            :name="showPassword ? 'visibility_off' : 'visibility'"
            class="cursor-pointer"
            @click="showPassword = !showPassword"
          />
        </template>
      </q-input>

      <q-btn
        color="primary"
        class="full-width q-mt-sm q-mb-sm"
        :label="isSignUp ? 'Create Account' : 'Sign In'"
        :loading="emailLoading"
        @click="submitForm"
      />

      <div class="text-center">
        <q-btn
          flat
          dense
          size="sm"
          color="grey-7"
          :label="isSignUp ? 'Already have an account? Sign in' : 'New here? Create account'"
          @click="isSignUp = !isSignUp; errorMsg = ''"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import {
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { myAuth } from 'src/lib/assetdb/myfirebase'
import { useAppStore } from 'src/stores'

export default defineComponent({
  name: 'FirebaseLogin',
  setup() {
    const store = useAppStore()

    const email = ref('')
    const password = ref('')
    const isSignUp = ref(false)
    const showPassword = ref(false)
    const errorMsg = ref('')
    const emailLoading = ref(false)
    const googleLoading = ref(false)

    const user = computed(() => store.user)

    async function logout(): Promise<void> {
      await signOut(myAuth())
      await store.logout()
    }

    async function signInWithGoogle(): Promise<void> {
      errorMsg.value = ''
      googleLoading.value = true
      try {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(myAuth(), provider)
      } catch (err: unknown) {
        errorMsg.value = (err as { message?: string }).message ?? 'Google sign-in failed'
      } finally {
        googleLoading.value = false
      }
    }

    async function submitForm(): Promise<void> {
      errorMsg.value = ''
      if (!email.value || !password.value) {
        errorMsg.value = 'Email and password are required'
        return
      }
      emailLoading.value = true
      try {
        if (isSignUp.value) {
          await createUserWithEmailAndPassword(myAuth(), email.value, password.value)
        } else {
          await signInWithEmailAndPassword(myAuth(), email.value, password.value)
        }
        password.value = ''
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? ''
        const msg = (err as { message?: string }).message ?? 'Authentication failed'
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          errorMsg.value = 'Invalid email or password'
        } else if (code === 'auth/email-already-in-use') {
          errorMsg.value = 'An account with this email already exists'
        } else if (code === 'auth/weak-password') {
          errorMsg.value = 'Password must be at least 6 characters'
        } else {
          errorMsg.value = msg
        }
      } finally {
        emailLoading.value = false
      }
    }

    return {
      email, password, isSignUp, showPassword, errorMsg,
      emailLoading, googleLoading, user,
      logout, signInWithGoogle, submitForm,
    }
  }
})
</script>
