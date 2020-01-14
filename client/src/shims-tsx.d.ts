import Vue, { VNode } from 'vue';

declare global {
  namespace JSX {
    // tslint:disable no-empty-interface
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Element extends VNode {}
    // tslint:disable no-empty-interface
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ElementClass extends Vue {}
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      [elem: string]: any;
    }
  }
}
