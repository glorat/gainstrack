
declare module 'vue-tour' {
    const VueTour: any;
    export default VueTour;

    export interface Tour {
        start(): void
        currentStep: any
    }
}
