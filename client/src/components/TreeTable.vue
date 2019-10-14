<template>
    <ol v-if="node && node.assetBalance" class="tree-table" v-bind:title="table_hover_text">
        <li class="head">
            <p>
          <span class="account-cell">
            <button type="button" class="link expand-all hidden" title="Expand all accounts">Expand all</button>
          </span>
                <span class="other">Value</span>
            </p>
        </li>
        <li class="">
            <p v-bind:class="{has_balance: node.assetBalance.length>0}">
                <span class="account-cell droptarget" v-bind:class="classObject" data-account-name={node.name}>
                    <router-link v-bind:to="'/account/' + node.name">{{ node.shortName }}</router-link>
                </span>
                <span class="num other">
                    <span v-for="x in node.assetBalance">{{x}}<br /></span>
                </span>
            </p>
            <tree-table-node v-bind:node="node" depth="1"></tree-table-node>
        </li>


    </ol>
</template>

<script>
    import TreeTableNode from './TreeTableNode';

    export default {
        name: 'TreeTable',
        props: {node: Object},
        data() {
            return {
                table_hover_text: 'todo hover',
                depth: 0,
                /*
                node: {
                    name: 'Assets:Foo',
                    assetBalance: ['100 USD', '50 GBP'],
                    children: [
                        {
                            name: 'Assets:Foo:Bar',
                            assetBalance: ['100 USD'],
                            children: [
                                {
                                    name: 'Assets:Foo:Bar:Baz',
                                    assetBalance: ['100 USD'],
                                }
                            ]
                        }
                    ]
                }*/
            }
        },
        computed: {
            classObject() {
                const ret = {};
                ret['depth-' + this.depth] = true;
                ret['has-children'] = this.node.children && this.node.children.length > 0;
                return ret;
            }
        },
        components: {TreeTableNode}
    }
</script>

<style scoped>

</style>
