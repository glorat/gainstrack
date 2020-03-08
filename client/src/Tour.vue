<template>
    <v-tour name="myTour" :steps="steps" :options="options">
        <template slot-scope="tour">
            <transition name="fade">
                <v-step
                        v-if="tour.currentStep === index"
                        v-for="(step, index) of tour.steps"
                        :key="index"
                        :step="step"
                        :previous-step="tour.previousStep"
                        :next-step="tour.nextStep"
                        :stop="tour.stop"
                        :is-first="tour.isFirst"
                        :is-last="tour.isLast"
                        :labels="tour.labels"
                        :highlight="tour.highlight"
                >

                    <div slot="actions">
                        <button v-if="!tour.isLast && hasNext(step) && !customSteps.length>0"
                                @click.prevent="tour.nextStep"
                                class="btn btn-primary">Next step
                        </button>
                        <template v-for="step in customSteps">
                            <button @click="jumpTo(step.target)" class="btn btn-primary" :style="step.buttonStyle">{{
                                step.label }}
                            </button>
                            <br>
                        </template>
                        <button @click.prevent="tour.finish" v-if="tour.isLast" class="btn btn-primary">Have Fun!
                        </button>
                        <br>
                        <span @click="tour.stop" style="font-size: x-small; cursor: pointer">Skip Tour</span>
                    </div>
                </v-step>
            </transition>
        </template>
    </v-tour>
</template>

<script lang="ts">
    import EventBus from '@/event-bus';
    import {AccountCommandDTO, AuthenticationDTO} from '@/models';
    import {debounce} from 'lodash';
    import Vue from 'vue';
    import {Route} from 'vue-router';
    import {Tour} from 'vue-tour';

    import VueTour from 'vue-tour';
    // tslint:disable-next-line
    require('vue-tour/dist/vue-tour.css');
    Vue.use(VueTour);

    interface CustomStep {
        target: string
        label: string
        buttonStyle?: string
    }

    interface TourStep {
        id?: string
        header?: object
        target?: string
        content: string
        customSteps?: CustomStep[]
        eventTest?: (e: string, c: AccountCommandDTO | Route) => boolean
        cmdTest?: (c: AccountCommandDTO) => boolean
        //  For placement, see https://popper.js.org/docs/v1/#Popper.placements
        params?: object

    }

    function isRoute(c: AccountCommandDTO | Route): c is Route {
        return (c as Route).path !== undefined;
    }

    function isAccountCommandDTO(c: AccountCommandDTO | Route): c is Route {
        return (c as AccountCommandDTO).date !== undefined;
    }

    const mkParagraphs = (ps: string[]): string => {
        return ps.map(p => `<p style="text-align: left">${p}</p>`).join('');
    };

    const routedToEventTest = (path: string) => (e: string, c: AccountCommandDTO | Route): boolean => {
        return e === 'routed-to' && isRoute(c) && c.path === path;
    };

    const addRecord: TourStep = {
        // target: '#add-record', // popper handles this wrong
        target: '.myaside',
        header: {
            title: 'Begin adding your records',
        },
        content: `Click "Add Record" on the left menu bar`,
        params: {
            placement: 'right-start',
            enabledButtons: {buttonNext: false}
        },
        eventTest: routedToEventTest('/add'),
    };

    const addAccounts: TourStep = {
        // target: '#add-record', // popper handles this wrong
        target: '.myaside',
        header: {
            title: 'Begin adding your records',
        },
        content: `Click "Accounts" on the left menu bar`,
        params: {
            placement: 'right-start',
            enabledButtons: {buttonNext: false}
        },
        eventTest: routedToEventTest('/command')
    };

    // const chooseInvestment: TourStep = {
    //     target: '.c-account-id',
    //     content: 'Choose your investment account (called Assets:Investment)',
    //     params: {
    //         placement: 'right'
    //     },
    //     cmdTest(c) {
    //         return c && isAccountCommandDTO(c) && c.accountId.startsWith('Assets:Investment');
    //     },
    // };

    const chooseAccount = (accountId: string): TourStep => {
        return {
            target: `.account-entry[tag="${accountId}"]`,
            content: `Choose "${accountId}"`,
            eventTest: routedToEventTest(`/command/${accountId}`),
        };
    };

    const chooseInvestmentAccount: TourStep = {
        ...chooseAccount('Assets:Investment'),
        content: 'Select your investment account Assets:Investment',
    };

    const chooseBankAccount: TourStep = {
        target: '.c-account-id',
        content: 'Choose your bank account (called Assets:Bank)',
        params: {
            placement: 'right'
        },
        cmdTest(c) {
            return c && isAccountCommandDTO(c) && c.accountId.startsWith('Assets:Bank');
        },
    };

    //  const routedToEventTest = (path: string) => (e: string, c: AccountCommandDTO | Route): boolean => {

    const clickToBeginAdd = (commandType: string): TourStep => {
        return {
            target: `button[tag="${commandType}"]`,
            content: 'Click "Fund" to fund our investment account',
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.commandType === commandType;
            },
        };
    };

    const addCommand: TourStep = {
        target: '.c-add',
        content: 'Press "Add" to save this record',
        params: {
            placement: 'bottom'
        },
        eventTest(e, c) {
            return e === 'command-added';
        },
    };

    const tourBalanceSheet: TourStep = {
        // target: '#route-balance_sheet', // popper fails on this
        target: '.myaside',
        content: 'Navigate to the balance sheet to see the effect',
        params: {
            placement: 'right-start'
        },
        eventTest: routedToEventTest('/balance_sheet'),
    };

    const fundTour: TourStep[] = [
        {

            id: 'fund',
            target: '#page-title',
            content: mkParagraphs(['Typically an investment account requires funding from somewhere like your bank account before making trades',
                'This guide will walk you through recording that funding',
            ])
        },
        {
            ...addAccounts,
        },
        {
            ...chooseInvestmentAccount
        },
        {
            ...clickToBeginAdd('fund'),
            content: 'Click "Fund" to fund our investment account',
        },
        {
            target: '.c-change',
            content: mkParagraphs(['Record funding of 10000 USD to the investment account',
            'The investment account has preset to be funded from the Assets:Bank account']),
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.change !== undefined && c.change.number > 9999
                    && c.change.ccy !== '';
            },
            params: {
                placement: 'bottom'
            }
        },
        addCommand,
        tourBalanceSheet,
        {
            target: '#assets-table',
            content: 'Here we can see money transferred from the bank account to the investment account',
            params: {
                placement: 'top'
            },
            customSteps: [{target: 'choice', label: 'Next Step'}],
        },
    ];

    const tradeTour: TourStep[] = [
        {
            ...addAccounts,
            id: 'trade',
        },
        {
            ...chooseInvestmentAccount
        },
        {
            ...clickToBeginAdd('trade'),
            content: 'Click "Trade" to record a trade',
        },
        {
            target: '.c-change',
            content: 'Enter the shares you are purchasing, e.g. 5 GOOG shares',
            params: {
                placement: 'bottom'
            },
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.change !== undefined && c.change.number > 0 && c.change.ccy !== '';
            },
        },
        {
            target: '.c-price',
            content: 'Enter the price you bought the shares for, e.g. 1500 USD',
            params: {
                placement: 'bottom'
            },
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.price !== undefined && c.price.number > 200 && c.price.ccy !== '';
            },
        },
        {
            ...addCommand
        },
        {
            ...tourBalanceSheet,
        },
        {
            target: '#assets-table',
            content: 'Here we can see you now have some GOOG and your USD value has decreased',
            params: {
                placement: 'top'
            },
            customSteps: [{target: 'choice', label: 'Next Step'}],
        },
    ];

    const earnTour: TourStep[] = [
        {
            ...addAccounts,
            id: 'earn'
        },
        {
            ...chooseAccount('Income:Salary')
        },
        {
            ...clickToBeginAdd('earn'),
            content: 'Click "Earn" record salary being received',
        },
        {
            target: '.c-change',
            content: 'Enter how much you earned - 50000 USD',
            params: {
                placement: 'bottom'
            },
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.change !== undefined
                    && c.change.number > 49999 && c.change.ccy !== '';
            },
        },
        addCommand,
        tourBalanceSheet,
        {
            target: '#assets-table',
            content: 'In the accounts we can see your bank balance has increased by your salary',
            params: {
                placement: 'top'
            },
            customSteps: [{target: 'choice', label: 'Next Step'}],
        },
    ];

    const fxTour: TourStep[] = [
        {
            id: 'fxtfr',
            target: '#page-title',
            content: mkParagraphs(['In this guide, we are going to convert some of our USD into pound sterling GBP',
                'In this example, conversion will be done within the preset Investment account since that is a multi-asset account',
                'FX conversions can also be done across different accounts. Or one can simply do simple non-FX transfers'
            ])
        },
        {
            ...addAccounts,
        },
        {
            ...chooseInvestmentAccount
        },
        {
            ...clickToBeginAdd('tfr'),
            content: 'Click "Transfer"',
        },
        {
            target: '.c-change',
            content: 'Enter quantity being sold, e.g. 1000 USD',
            params: {
                placement: 'bottom'
            },
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.change !== undefined
                    && c.change.number > 999 && c.change.ccy !== '';
            },
        },
        {
            target: '.c-other-account',
            content: 'Choose your "Assets:Investment" for internal account transfer exchange',
            params: {
                placement: 'right'
            },
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.otherAccount !== undefined
                    && c.otherAccount.startsWith('Assets:Investment');
            },
        },
        {
            target: '.c-options-target-change',
            content: 'Enter quantity being bought, e.g. 800 GBP',
            params: {
                placement: 'bottom'
            },
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.change !== undefined
                    && c.options !== undefined && c.options.targetChange.number > 500
                    && c.change.ccy !== c.options.targetChange.ccy;
            },
        },
        addCommand,
        tourBalanceSheet,
        {
            target: '#assets-table',
            content: 'In the accounts we can see money has moved between currencies',
            params: {
                placement: 'top'
            },
            customSteps: [{target: 'choice', label: 'Next Step'}],
        },
    ];

    const balTour: TourStep[] = [
        {
            id: 'bal',
            target: '#page-title',
            content: mkParagraphs(['While normal accounting software requires you to record every transaction and ensure everything balances, we think that is too much work',
                'Instead, you only need to record your major earnings and investments. Then by supplying your resulting account balances, you can get a view of your general expenses without further input',
                'Let us record your bank balance as you may see it on your bank statement'])
        },

        {
            ...addAccounts,
        },
        {
            ...chooseAccount('Assets:Bank')
        },
        {
            ...clickToBeginAdd('bal'),
            content: 'Click "Balance" to record a bank balance',
        },
        {
            target: '.c-balance',
            content: 'Enter the actual balance of your bank account (1000 USD)',
            params: {
                placement: 'bottom'
            },
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.balance !== undefined
                    && c.balance.number > 999 && c.balance.ccy !== '';
            },
        },
        {
            target: '.c-other-account',
            content: mkParagraphs(['The adjustment set your balance needs to be accounted for somewhere. Recommend choices include "Equity:Opening" for one-off sources of income or starting balances. "Expenses:General" is a good choice for current accounts.',
                'For this walkthrough, choose "Expenses:General"']),
            params: {
                placement: 'right'
            },
            cmdTest(c) {
                return c && isAccountCommandDTO(c) && c.otherAccount !== undefined
                    && c.otherAccount.startsWith('Expenses:General');
            },
        },
        addCommand,
        tourBalanceSheet,
        {
            target: '#assets-table',
            content: 'In the accounts we can see your bank balance has been adjusted to 1000 USD',
            params: {
                placement: 'top'
            },
            customSteps: [{target: 'choice', label: 'Next Step'}],
        },
    ];

    const mySteps: TourStep[] = [
        {
            target: '#page-title',
            content: 'If you would like a guided tour on how to use this site, press Next'
        },
        {
            target: '#page-title',
            content: mkParagraphs(['Gainstrack can become your personal accountant, a place to record all your activities that contribute to your networth and get insight over your networth and wealth. Suppose you have an investment account that you have funded with some cash and bought some shares. How can this be recorded? This guide will show you how as an example']),
        },
        {
            target: '#page-title',
            id: 'choice',
            content: 'There are different types of events that can be recorded. Which guide would you like to try next?',
            customSteps: [
                {target: 'fund', label: '1. Fund Investment Account', buttonStyle: 'width: 200px; text-align: left;'},
                {target: 'trade', label: '2. Trade Shares', buttonStyle: 'width: 200px; text-align: left;'},
                {target: 'fxtfr', label: '3. FX Transfer', buttonStyle: 'width: 200px; text-align: left;'},
                {target: 'earn', label: '4. Record salary earnings', buttonStyle: 'width: 200px; text-align: left;'},
                {target: 'bal', label: '5. Bank balance adjustment', buttonStyle: 'width: 200px; text-align: left;'},
                {target: 'end', label: 'All Done', buttonStyle: 'width: 200px; text-align: left;'}
            ],
        },
        ...fundTour,
        ...tradeTour,
        ...fxTour,
        ...balTour,
        ...earnTour,
        {
            // target: '#route-balance_sheet', // popper fails on this
            id: 'end',
            target: '.login',
            content: 'Thank you for completing the guided tour. Feel free to keep making any changes and experiment. If you want your changes to be saved, you will need to Sign/Up Login',
            params: {
                placement: 'right-start'
            }
        },
    ];

    export default Vue.extend({
        name: 'Tour',
        data() {
            const self = this;
            return {
                options: {
                    // Make true when ready. Unfortunately, popper is misplacing and highlight occludes drop downs
                    highlight: false
                },
                steps: mySteps,
            };
        },
        methods: {
            jumpTo(targetId: string): void {
                const targetStep = this.steps.find(step => step.id === targetId);
                if (targetStep) {
                    // Immediately step to with no debounce
                    // Step must work on same page as source!
                    this.$tours.myTour.currentStep = this.steps.indexOf(targetStep);
                }
            },
            goto(target: string): void {
                // tslint:disable-next-line
                const gogo = () => this.$router.push(target).catch(err => {
                });
                // Async this to avoid re-entrancy bug on router handler
                debounce(gogo, 100);
            },
            nextStep: debounce(function(this: any) {
                this.$tours.myTour.nextStep();
            }, 500),
            hasNext(step: TourStep): boolean {
                if (step.eventTest || step.cmdTest) {
                    return false;
                } else {
                    return true;
                }
            },
        },
        computed: {
            authentication(): AuthenticationDTO {
                return this.$store.state.summary.authentication;
            },
            customSteps(): CustomStep[] {
                const currentStep = this.steps[this.$tours.myTour.currentStep];
                return currentStep.customSteps || [];
            },
        },
        mounted() {
            // TODO: Undo this hack where we just assume the new route will render in time
            const eventTriggerDelay = 500;
            const self = this;

            // The tour is for anonymous users only
            if (!this.authentication.username) {
                this.$router.afterEach((to, from) => {
                    const currentStep = this.steps[this.$tours.myTour.currentStep];
                    if (currentStep && currentStep.eventTest && currentStep.eventTest('routed-to', to)) {
                        self.nextStep();
                    }
                    // console.log(`routed to ${to.path} ${JSON.stringify(to.query)}`)
                });

                EventBus.$on('command-changed', (c: AccountCommandDTO) => {
                    const currentStep = this.steps[this.$tours.myTour.currentStep];
                    if (currentStep && currentStep.cmdTest && currentStep.cmdTest(c)) {
                        self.nextStep();
                    }
                });
                EventBus.$on('command-added', (c: AccountCommandDTO) => {
                    const currentStep = this.steps[this.$tours.myTour.currentStep];
                    if (currentStep && currentStep.eventTest && currentStep.eventTest('command-added', c)) {
                        self.nextStep();
                    }
                });

                this.$tours.myTour.start();
            }
        },
    });
</script>

<style scoped>

</style>
