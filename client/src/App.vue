<template>
  <div>
    <router-view></router-view>
<!--    <my-sentry></my-sentry>-->
    <my-firebase></my-firebase>
  </div>
</template>

<style>

</style>

<script>
import { MyFirebase, MySentry } from './lib/loader'

export default {
  components: { MySentry, MyFirebase }
}
</script>
