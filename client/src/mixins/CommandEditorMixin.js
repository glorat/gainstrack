import {mapGetters} from "vuex";
import EventBus from '@/event-bus';

export const CommandEditorMixin = {
    inheritAttrs: false,
    props: {cmd: Object},
    data() {
        let c = {};
        if (this.cmd) {
            c = {...this.cmd}
        }
        c.date = c.date || new Date().toISOString().slice(0, 10);
        c.change = c.change || {number: 0, ccy: ''};
        c.balance = c.balance || {number: 0, ccy: ''};
        c.price = c.price || {number: 0, ccy: ''};
        c.commission = c.commission || {number: 0, ccy: ''};
        c.accountId = c.accountId || '';
        c.otherAccount = c.otherAccount || '';
        return {c};
    },
    methods: {
        inputChanged() {
            //const str = this.toGainstrack;
            //this.$emit('gainstrack-changed', str);
        },
    },
    updated() {
        const str = this.toGainstrack;
        this.$emit('gainstrack-changed', str);
    },
    mounted() {
        const str = this.toGainstrack;
        this.$emit('gainstrack-changed', str);
    },
    watch: {
        c: {
            handler() {
                EventBus.$emit('command-changed', this.c);
            },
            deep: true,
        },
        toGainstrack() {
            const str = this.toGainstrack;
            EventBus.$emit('gainstrack-changed', str);
            this.$emit('gainstrack-changed', str);
        }
    },
    computed: {
        ...mapGetters([
            'tradeableAccounts',
            'findAccount',
            'mainAccounts',
            'mainAssetAccounts',
        ]),
    }
};