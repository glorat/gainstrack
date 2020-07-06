<template>
  <div id="q-app">
    <my-layout></my-layout>
    <my-sentry></my-sentry>
    <my-firebase></my-firebase>
  </div>
</template>

<style>

</style>

<script>
import MyLayout from './pages/MyLayout'
import { MyFirebase, MySentry } from './lib/loader'

export default {
  components: { MyLayout, MySentry, MyFirebase }
}
</script>
