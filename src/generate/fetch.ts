import * as fetchImport from 'isomorphic-unfetch'
const fetch = require('isomorphic-unfetch');
export default fetch as typeof fetchImport.default;
