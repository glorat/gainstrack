<template>
    <div class="root">
        Here
        <SlickList lockAxis="y" v-model="items">
            <SlickItem v-for="(item, index) in items" :index="index" :key="index">
                {{ item }}
            </SlickItem>
        </SlickList>
        There
    </div>
</template>

<script>
    import { ContainerMixin, ElementMixin } from 'vue-slicksort';
    import { SlickList, SlickItem } from 'vue-slicksort';

    const SortableList = {
        mixins: [ContainerMixin],
        template: `
            <ul class="list">
                <slot/>
            </ul>`
    };

    const SortableItem = {
        mixins: [ElementMixin],
        props: ['item'],
        template: `<li class="list-item">{{item}}</li>`
    };

    export default {
        name: 'AccountSelector',
        components: {
            SortableItem,
            SortableList,
            SlickList,
            SlickItem
        },
        data() {
            return {
                items: this.$store.state.summary.accountIds
            }
        },
        computed: {
            accounts() {
                return this.$store.state.summary.accountIds;
            },
        }
    }
</script>

<style scoped>

</style>