<template>
    <button type="button" :title="`Toggle ${name} entries`" :class="{inactive : offState[name]}" @click="onClick">{{ name }}</button>
</template>

<script lang="ts">
    import {defineComponent} from 'vue'

    export default defineComponent({
        name: 'ButtonToggle',
        props: {
            name: String,
            offState: Object
        },
        methods: {
          onClick() {
              this.offState![this.name!] = !this.offState![this.name!];
          }
        }
    })
</script>

<style scoped>

</style>
