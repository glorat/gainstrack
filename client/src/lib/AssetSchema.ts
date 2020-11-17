import {AssetDTO, AssetOptions} from "src/lib/models";

export interface AssetProperty {
  name: string
  label: string
  description: string
  schema: string // enum
}

const assetCategories = [
  {name: 'currency', label: 'Currency', description: 'FX Currency or equivalent'},
  {name: 'listed', label: 'Listed', description: 'Stocks, ETFs and other things with prices listed on exchanges'},
  {name: 'property', label: 'Property', description: 'Tangible things you own like houses, cars'},
  {name: 'cash', label: 'Cash', description: 'Cash or equivalent deposited in an account'},
]
const assetProperties = [
  {name: 'category', label: 'Category', description: 'Category or type of asset', schema: 'category'},
  {name: 'ticker', label: 'Ticker', description: 'Ticker symbol for listed quotes', schema: 'ticker'},
  {name: 'proxy', label: 'Benchmark', description: 'Ticker symbol of benchmark that the asset tracks', schema: 'ticker'},
]

const nameProperty ={name: 'name', label: 'Short Name', description: 'Short name for you to identify the asset', schema: 'asset'}
const unknownProperty = (name: string) => {return {name, label: `UNKNOWN ${name}`, description: 'Internal error', schema: 'unknown'}}

const newAssetProperties = [
  nameProperty,
  {name: 'units', label: 'Units or Quantity', description: 'Number of this asset you own', schema: 'number'},
  {name: 'date', label: 'Purchase Date', description: 'When asset was procured', schema: 'date'},
  {name: 'price', label: 'Purchase Price', description: 'Price asset was purchased', schema: 'balance'},
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
  if (opts.editing) {
    return assetProperties
  } else {
    return allProperties;
  }
}

export function createAssetFromProps(props: Record<string, any>): AssetDTO{
  const options: AssetOptions = {tags: []}
  assetProperties.forEach(p => {
    if (props[p.name]) {
      options[p.name] = props[p.name]
    }
  })
  return {
    asset: props['name'],
    options
  }
}
