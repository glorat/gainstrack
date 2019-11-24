<template>
    <ol v-if="node && node.assetBalance && node.assetBalance.length>0" class="tree-table">
        <li class="head">
            <p>
          <span class="account-cell">
            <button type="button" class="link expand-all hidden" title="Expand all accounts">Expand all</button>
          </span>
                <span class="other">Value</span>
            </p>
        </li>
        <li class="">
            <p v-if="node.assetBalance.length>0">
                <span class="account-cell droptarget" v-bind:class="classObject" data-account-name={node.name}>
                    <router-link v-bind:to="'/account/' + node.name">{{ node.shortName }}</router-link>
                </span>
                <span class="num other">
                    <span v-for="x in node.assetBalance">{{x.value.toFixed(2)}} {{x.ccy}} <br /></span>
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
                depth: 0,
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

<style>
    /* Collapsible trees
     *
     * some of the shared styles are in `journal-table.css`
     */

    .tree-table.fullwidth {
        display: block;
        max-width: 100%;
        overflow-x: auto;
    }

    .tree-table p {
        margin-top: -1px;
    }

    .tree-table p > span {
        margin-right: -1px;
        border: 1px solid var(--color-table-header-background);
    }

    .tree-table .account-cell {
        display: flex;
        flex: 1;
        align-items: center;
        min-width: 14em;
        max-width: 30em;
    }

    .tree-table .account-cell.depth-1 {
        min-width: 13em;
        max-width: 29em;
        margin-left: 1em;
    }

    .tree-table .account-cell.depth-2 {
        min-width: 12em;
        max-width: 28em;
        margin-left: 2em;
    }

    .tree-table .account-cell.depth-3 {
        min-width: 11em;
        max-width: 27em;
        margin-left: 3em;
    }

    .tree-table .account-cell.depth-4 {
        min-width: 10em;
        max-width: 26em;
        margin-left: 4em;
    }

    .tree-table .account-cell.depth-5 {
        min-width: 9em;
        max-width: 25em;
        margin-left: 5em;
    }

    .tree-table .account-cell.depth-6 {
        min-width: 8em;
        max-width: 24em;
        margin-left: 6em;
    }

    .tree-table .account-cell.depth-7 {
        min-width: 7em;
        max-width: 23em;
        margin-left: 7em;
    }

    .tree-table .account-cell.depth-8 {
        min-width: 6em;
        max-width: 22em;
        margin-left: 8em;
    }

    .tree-table .account-cell.depth-9 {
        min-width: 5em;
        max-width: 21em;
        margin-left: 9em;
    }

    .tree-table .account-cell a {
        margin-left: 1em;
    }

    .tree-table .has-children {
        cursor: pointer;
    }

    .tree-table .has-children::before {
        margin: 0 -10px 0 0;
        content: "";
        border-top: 5px solid var(--color-treetable-expander);
        border-right: 5px solid transparent;
        border-left: 5px solid transparent;
    }

    .tree-table .num {
        width: 10em;
    }

    .tree-table .num a {
        display: block;
        color: inherit;
    }

    .tree-table .other {
        width: 13em;
    }

    .tree-table .other a {
        display: block;
        color: inherit;
    }

    .tree-table .balance-children {
        display: block;
        opacity: 0.7;
    }

    .tree-table .has-balance .balance {
        display: block;
    }

    .tree-table .has-balance .balance-children {
        display: none;
    }

    .tree-table .toggled ol {
        display: none;
    }

    .tree-table .toggled .balance {
        display: none;
    }

    .tree-table .toggled .balance-children {
        display: block;
        color: var(--color-text);
    }

    .tree-table .toggled .has-children::before {
        transform: rotate(270deg);
    }

    .tree-table .expand-all {
        margin-left: 15px;
        font-weight: normal;
        color: inherit;
        opacity: 0.5;
    }

    .tree-table .diff {
        margin-right: 3px;
        font-size: 0.9em;
        color: var(--color-budget-zero);
        white-space: nowrap;
    }

    .tree-table .diff.negative {
        color: var(--color-budget-negative);
    }

    .tree-table .diff.positive {
        color: var(--color-budget-positive);
    }

</style>
