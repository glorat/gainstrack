<template>
    <button type="button" :title="`Toggle ${name} entries`" :class="{inactive : offState[name]}" @click="onClick">{{ name }}</button>
</template>

<script lang="ts">
    import {defineComponent} from 'vue'

    export default defineComponent({
        name: 'ButtonToggle',
        props: {
            name: { type: String, required: true as const },
            offState: { type: Object as () => Record<string, boolean>, required: true as const }
        },
        methods: {
          onClick() {
              this.offState[this.name] = !this.offState[this.name];
          }
        }
    })
</script>

<style scoped>

</style>
