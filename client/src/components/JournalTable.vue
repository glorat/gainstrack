<template>
    <ol class="journal show-transaction show-cleared">
        <li class="head">
            <p>
                <span class="datecell" data-sort="string">Date</span>
                <span class="description" data-sort="string">Description</span>
                <span class="num" data-sort="number"></span>
                <span class="num" data-sort="number">Change</span>
                <span class="num" data-sort="number">Balance</span>
            </p>
        </li>
        <li class="transaction cleared" :class="{'show-postings':row.show}" v-for="row in entries">
            <p>
                <span class="datecell">{{ row.date }}</span>
                <span class="description">{{ row.description }}</span>
                <span class="indicators" v-on:click="rowClick(row)"><span v-for="i in row.postings"></span></span>
                <span data-sort="number"></span>
                <span class="num">{{ row.change }} </span>
                <span class="num">{{ row.position }}</span>
            </p>
            <ul class="postings">
                <li v-for="posting in row.postings">
                    <p>
                        <span class="datecell"></span>
                        <span class="description"><router-link :to="{name:'account', params: { accountId: posting.account }}">{{ posting.account }}</router-link></span>
                        <span class="num">{{ posting.value.value}} {{ posting.value.ccy }}</span>
                        <span class="num"></span>
                        <span class="num"></span>
                    </p>
                </li>
            </ul>
        </li>
    </ol>
</template>

<script>
    export default {
        name: "JournalTable",
        props: {entries: Object},
        methods: {
            rowClick(row) {
                this.$set(row, 'show', !row.show);
            },
        },
    }
</script>

<style scoped>

</style>