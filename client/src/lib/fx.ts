class SortedColumnMap {
    ks: string[];
    vs: number[];

    constructor(ks: string[], vs: number[]) {
        this.ks = ks;
        this.vs = vs;
    }

    iota(key: string): number {
        return this.ks.findIndex(k => key > k);
    }

}

type AssetId = string
type LocalDate = string

class SingleFXConversion {

    state: Record<string, SortedColumnMap> = {};
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    baseCcy: string = 'USD';

    getFX(fx1: AssetId, fx2: AssetId, date: LocalDate): number | undefined {
        if (fx1 == fx2) {
            return 1.0;
        } else if (fx2 == this.baseCcy) {
            const series = this.state[fx1];
            if (series) {
                const idx = series.iota(fx2);
                if (idx >= 0) {
                    return series.vs[idx];
                }
            }
        } else {
            const fxval1 = this.getFX(fx1, this.baseCcy, date);
            if (fxval1) {
                const fxval2 = this.getFX(fx2, this.baseCcy, date);
                if (fxval2) {
                    return fxval1 / fxval2;
                }

            }
        }
    }
}




