<template>
  <div>
    <router-view></router-view>
    <my-firebase></my-firebase>
  </div>
</template>

<style>

</style>

<script>
import { MyFirebase } from './lib/loader'

export default {
  components: { MyFirebase }
}
</script>
