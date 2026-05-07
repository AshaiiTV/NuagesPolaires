const fs = require('fs');
const src = fs.readFileSync('assets/js/api-hardening.js','utf8');
if(!src.includes('var args = Array.prototype.slice.call(arguments)')) {
  throw new Error('api-hardening wrapper must preserve arguments');
}
if(src.includes('return fn.apply(this, arguments);')) {
  throw new Error('api-hardening wrapper still drops outer arguments');
}
console.log('api-hardening wrapper argument forwarding OK');
