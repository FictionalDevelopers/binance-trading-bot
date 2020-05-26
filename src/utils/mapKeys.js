import _mapKeys from 'lodash/fp/mapKeys';

const mapKeys = keyMapper => _mapKeys(key => keyMapper[key] || key);

export default mapKeys;
