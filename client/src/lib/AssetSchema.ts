import {AssetDTO, AssetOptions} from 'src/lib/models';
import { keys, includes } from 'lodash';

export interface AssetProperty {
  name: string
  label: string
  description: string
  schema: string // enum
  valid?: (props: Record<string,any>) => boolean
}

export const assetCategories = [
  {value: 'investment', label: 'Investment', description: 'Stocks, ETFs and other intangible assets'},
  {value: 'realestate', label: 'Real Estate', description: 'Real estate, homes, land, buildings'},
  {value: 'property', label: 'Property', description: 'Tangible things you own like houses, cars'},
  {value: 'cash', label: 'Cash', description: 'Cash or equivalent deposited in an account'},
]

const categoryProperty = {name: 'category', label: 'Category', description: 'Category or type of asset', schema: 'category'};

const assetProperties:AssetProperty[] = [
  categoryProperty,
  {name: 'ticker', label: 'Ticker', description: 'Ticker symbol for listed quotes', schema: 'ticker',
    valid: (props) => props['category'] === 'investment' && !propDefined(props,'benchmark')
  },
  {name: 'proxy', label: 'Benchmark', description: 'Ticker symbol of benchmark that the asset tracks', schema: 'ticker',
  valid: (props) => !propDefined(props,'ticker')},
]

const nameProperty ={name: 'name', label: 'Short Name', description: 'Short name for you to identify the asset', schema: 'asset'}
const unknownProperty = (name: string) => {return {name, label: `UNKNOWN ${name}`, description: 'Internal error', schema: 'unknown'}}

const newAssetProperties: AssetProperty[] = [
  nameProperty,
  {name: 'units', label: 'Units or Quantity', description: 'Number of this asset you own', schema: 'number'},
  {name: 'date', label: 'Purchase Date', description: 'When asset was procured', schema: 'date',
    valid: (props) => props['category'] !== 'cash'},
  {name: 'price', label: 'Purchase Price', description: 'Price asset was purchased', schema: 'balance',
    valid: (props) => props['category'] !== 'cash'},
]

const mandatoryProperties: AssetProperty[] = [nameProperty, categoryProperty];
const optionalProperties = [...assetProperties, ...newAssetProperties].filter(p => !includes(mandatoryProperties, p))
const allProperties = [...mandatoryProperties, ...optionalProperties];

function propDefined(props: Record<string, any>, name: string):boolean {
  // Avoid Object prototype pollution as a defensive measure
  return Object.prototype.hasOwnProperty.call(props, name)
}

export function schemaFor(name: string): AssetProperty {
  const ret = allProperties.find(x => x.name === name);
  return ret ?? unknownProperty(name);
}

export function selectedPropertiesForAsset(props: Record<string, any>): AssetProperty[] {
  return allProperties.filter(p => propDefined(props, p.name))
}

export function validPropertiesForAsset(props: Record<string, any>, opts: {editing: boolean}): AssetProperty[] {
  if (!props['name']) {
    return [nameProperty]
  } else if (!props['category']) {
    return [categoryProperty]
  }
  const inScope = opts.editing ? assetProperties : allProperties;
  return inScope.filter(p => !p.valid || p.valid(props))
}

export function availablePropertiesForAsset(props: Record<string, any>, opts: {editing: boolean}): AssetProperty[] {
  const current = keys(props);
  const valid = validPropertiesForAsset(props, opts)
  return valid.filter(v => !includes(current, v.name))
}

const defaultCommodityDate = '1900-01-01'

export function createAssetFromProps(props: Record<string, any>): AssetDTO{
  const options: AssetOptions = {tags: []}
  assetProperties.forEach(p => {
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
