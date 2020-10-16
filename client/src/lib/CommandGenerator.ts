import {AccountCommandDTO, AssetDTO} from 'src/lib/models';

export function toCommodityGainstrack(asset: AccountCommandDTO | AssetDTO) {
  let str = `1900-01-01 commodity ${asset.asset}`
  const options = asset.options || {};
  for (const [key, value] of Object.entries(options)) {
    if (key === 'tags' && Array.isArray(value) && value.length > 0) {
      str += `\n tags: ${value.join(',')}`
    } else if (value && !Array.isArray(value)) { // isScalar
      str += `\n  ${key}: ${value}`
    }
  }
  return str
}
