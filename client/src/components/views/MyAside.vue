<template>
    <aside>
    <ul v-for="menuItems in config.navigation_bar" class="navigation">
        <li v-for="id in menuItems">
            <router-link v-bind:to="'/' + id">{{ config.all_pages[id][0]  }}</router-link>
        </li>
    </ul>
    </aside>
</template>


<script>
    export default {
        name: "MyAside",
        data: function() {
            return {
                menuItems: ['foo', 'bar'],
                url_for: function (x) {
                    return x;
                },
                config: {
                    all_pages: {
                        'balance_sheet': ['Balance Sheet', 'g b'],
                        'prices': ['Prices', 'g c'],
                        'editor': ['Editor', 'g e'],
                        'errors': ['Errors', ''],
                        'events': ['Events', 'g E'],
                        'help': ['Help', 'g H'],
                        'holdings': ['Holdings', 'g h'],
                        'import': ['Import', 'g n'],
                        'income_statement': ['Income Statement', 'g i'],
                        'journal': ['Journal', 'g j'],
                        'options': ['Options', 'g o'],
                        'query': ['Query', 'g q'],
                        'statistics': ['Statistics', 'g x'],
                        'trial_balance': ['Trial Balance', 'g t'],

                        'irr':              ['IRR',    ''],
                        'command': ['Commands', '']
                    },
                    navigation_bar: [
                        ['command'],
                        ['income_statement', 'balance_sheet', 'trial_balance', 'journal', 'query'],
                        ['irr'],
                        ['holdings', 'prices', 'events', 'statistics'],
                        ['editor', 'import', 'options', 'help']
                    ]
                }
            };
        }
    }
</script>

<style scoped>

</style>
