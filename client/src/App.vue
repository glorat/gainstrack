<template>
  <div>
    <router-view></router-view>
    <my-firebase></my-firebase>
  </div>
</template>

<style>

</style>

<script setup lang="ts">
import { MyFirebase } from './lib/loader'
</script>
