import {AssetDTO, AssetOptions} from 'src/lib/models';
import { without, keys, includes } from 'lodash';

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
const assetProperties:AssetProperty[] = [
  {name: 'category', label: 'Category', description: 'Category or type of asset', schema: 'category'},
  {name: 'ticker', label: 'Ticker', description: 'Ticker symbol for listed quotes', schema: 'ticker',
    valid: (props) => props['category'] === 'investment'
  },
  {name: 'proxy', label: 'Benchmark', description: 'Ticker symbol of benchmark that the asset tracks', schema: 'ticker'},
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

const allProperties = [...assetProperties, ...newAssetProperties]

export function schemaFor(name: string): AssetProperty {
  const ret = allProperties.find(x => x.name === name);
  return ret ?? unknownProperty(name);
}

export function validPropertiesForAsset(props: Record<string, any>, opts: {editing: boolean}): AssetProperty[] {
  if (!props['name']) {
    return [nameProperty]
  }
  const inScope = opts.editing ? assetProperties : allProperties;
  return inScope.filter(p => !p.valid || p.valid(props))
}

export function availablePropertiesForAsset(props: Record<string, any>, opts: {editing: boolean}): AssetProperty[] {
  const current = keys(props);
  const valid = validPropertiesForAsset(props, opts)
  return valid.filter(v => !includes(current, v.name))
}


export function createAssetFromProps(props: Record<string, any>): AssetDTO{
  const options: AssetOptions = {tags: []}
  assetProperties.forEach(p => {
    if (props[p.name]) {
      options[p.name] = props[p.name]
    }
  })
  return {
    asset: props['name'] ?? 'undefined',
    options
  }
}
