import {AssetDTO, AssetOptions} from 'src/lib/models';
import {includes, keys} from 'lodash';
import {EnumEntry, fundManagement, incomeTreatment, investmentAssetTypes} from 'src/lib/enums';

export interface AssetProperty {
  name: string
  label: string
  description: string
  fieldType: string // enum
  fieldMeta?: EnumEntry[] | unknown
  valid?: (props: Record<string,any>) => boolean
}

const categoryProperty = {name: 'category', label: 'Category', description: 'Category or type of asset', fieldType: 'category'};

export const userAssetProperties:AssetProperty[] = [
  categoryProperty,
  {name: 'ticker', label: 'Ticker', description: 'Ticker symbol for listed quotes', fieldType: 'ticker',
    valid: (props) => props['category'] === 'investment' && !propDefined(props,'benchmark')
  },
  {name: 'proxy', label: 'Benchmark', description: 'Ticker symbol of benchmark that the asset tracks', fieldType: 'ticker',
  valid: (props) => !propDefined(props,'ticker')},
];

export const investmentAssetProperties: AssetProperty[] = [
  {name: 'isin', label: 'ISIN', description: 'ISIN', fieldType: 'string'},
  {name: 'type', label: 'Type', description: 'Stock/ETF/Fund', fieldType: 'enum', fieldMeta: investmentAssetTypes},
  {name: 'fundManagement', label: 'Fund Management', description: 'Active vs Passive managed funds', fieldType: 'enum', fieldMeta: fundManagement,
  valid: props => includes(['etf','fund'], props['type'])},
  {name: 'incomeTreatment', label: 'Income Treatment', description: 'Accumulation vs Distribution', fieldType: 'enum', fieldMeta: incomeTreatment,
    valid: props => includes(['etf','fund'], props['type'])},
  {name: 'geography', label: 'Geography', description: 'Region the ETF/Fund covers', fieldType: 'string',
    valid: (props) => includes(['etf','fund','index'], props['type'])
  },
  {name: 'domicile', label: 'Domicile', description: 'Domicile of asset', fieldType: 'string'}
];

const nameProperty ={name: 'name', label: 'Short Name', description: 'Short name for you to identify the asset', fieldType: 'asset'}
const unknownProperty = (name: string) => {return {name, label: `UNKNOWN ${name}`, description: 'Internal error', fieldType: 'unknown'}}

const newAssetProperties: AssetProperty[] = [
  nameProperty,
  {name: 'units', label: 'Units or Quantity', description: 'Number of this asset you own', fieldType: 'number'},
  {name: 'date', label: 'Purchase Date', description: 'When asset was procured', fieldType: 'date',
    valid: (props) => props['category'] !== 'cash'},
  {name: 'price', label: 'Purchase Price', description: 'Price asset was purchased', fieldType: 'balance',
    valid: (props) => props['category'] !== 'cash'},
];



const mandatoryProperties: AssetProperty[] = [nameProperty, categoryProperty];
const optionalProperties = [...userAssetProperties, ...newAssetProperties].filter(p => !includes(mandatoryProperties, p))
const allProperties = [...mandatoryProperties, ...optionalProperties];

interface AssetSchemaConfig {
  properties: AssetProperty[]
  validPropertiesForAsset(fields: Record<string, any>):AssetProperty[]
}

export class AssetSchema {
  constructor(readonly schemaConfig: AssetSchemaConfig) {
  }

  get properties() {
    return this.schemaConfig.properties
  }

  validPropertiesForAsset(props: Record<string, any>) {
    return this.schemaConfig.validPropertiesForAsset(props)
    // return this.schemaConfig.properties.filter(p => !p.valid || p.valid(props))
  }


   selectedPropertiesForAsset(props: Record<string, any>): AssetProperty[] {
    return this.properties.filter(p => propDefined(props, p.name))
  }

  /** valid and not yet in props */
  availablePropertiesForAsset(props: Record<string, any>): AssetProperty[] {
    const current = keys(props);
    const valid = this.validPropertiesForAsset(props);
    return valid.filter(v => !includes(current, v.name))
  }

}

export const userAssetSchema: AssetSchema = new AssetSchema({
  properties: userAssetProperties,
  validPropertiesForAsset(props: Record<string, any>) {
    if (!props['name']) {
      return [nameProperty]
    } else if (!props['category']) {
      return [categoryProperty]
    }
    const inScope = this.properties
    return inScope.filter(p => !p.valid || p.valid(props))
  }
});

export const investmentAssetSchema: AssetSchema = new AssetSchema({
  properties: investmentAssetProperties,
  validPropertiesForAsset(fields: Record<string, any>): AssetProperty[] {
    return this.properties.filter(p => !p.valid || p.valid(fields))
  }
});

function propDefined(props: Record<string, any>, name: string):boolean {
  // Avoid Object prototype pollution as a defensive measure
  return Object.prototype.hasOwnProperty.call(props ?? {}, name)
}

export function schemaFor(name: string): AssetProperty {
  const ret = allProperties.find(x => x.name === name);
  return ret ?? unknownProperty(name);
}

const defaultCommodityDate = '1900-01-01'

export function createAssetFromProps(props: Record<string, any>): AssetDTO{
  const options: AssetOptions = {tags: []}
  userAssetProperties.forEach(p => {
    if (props[p.name]) {
      options[p.name] = props[p.name]
    }
  })

  const asset = {
    commandType: 'commodity',
    date: defaultCommodityDate,
    asset: props['name'] ?? 'undefined',
    options
  }
  return asset;
}
