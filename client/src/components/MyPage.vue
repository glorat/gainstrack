<template>
    <q-page :padding="padding" :style-fn="styleFn" >
        <slot></slot>
    </q-page>
</template>

<script lang="ts">
    import {defineComponent} from 'vue';

    export default defineComponent({
        name: 'MyPage',
        props: ['padding'],
        methods: {
            styleFn(offset: number) {
                // "offset" is a Number (pixels) that refers to the total
                // height of header + footer that occupies on screen,
                // based on the QLayout "view" prop configuration

                const fixup = 40;
                return { minHeight: offset ? `calc(100vh - ${offset + fixup}px)` : '100vh' };
            }
        }
    });


</script>

<style scoped>

</style>
