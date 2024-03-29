import {mapGetters} from 'vuex';
import EventBus from '../event-bus';
import HelpTip from '../components/HelpTip';
import CommandDateEditor from '../components/CommandDateEditor';

export const CommandEditorMixin = {
    inheritAttrs: false,
    props: {cmd: Object, options:Object},
    components: {CommandDateEditor, HelpTip},
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
        c.options = c.options || {};
        c.asset = c.asset || '';
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
        // Initiate immediate defaulting
        // if (this.c.accountId && this.accountIdChanged) {
        //     this.accountIdChanged();
        // }

        const str = this.toGainstrack;
        this.$emit('gainstrack-changed', str);
      EventBus.$emit('command-changed', this.dc);
    },
    watch: {
        c: {
            handler() {
                EventBus.$emit('command-changed', this.dc);
                this.$emit('command-changed', this.dc);
                this.$emit('input', this.c);
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
            'fxConverter',
          'allStateEx',
        ]),
        accountId() {return this.dc.accountId},
      hideAccount() {
          return this.options && this.options.hideAccount;
      },
      dc() {
          return this.c; // Override me to handle defaulting!
      }
    },
};
