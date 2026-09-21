"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const script=path.join(__dirname,'test-auth-flows.js');
function run(target){return spawnSync(process.execPath,[script],{encoding:'utf8',timeout:2000,env:{...process.env,NP_TEST_BASE_URL:target,URL:'https://production.invalid'}});}
test('Remote account creation tests require an explicit NP_TEST_BASE_URL even on Netlify',()=>{
 const result=run('');assert.equal(result.status,2);assert.match(result.stderr,/Usage: NP_TEST_BASE_URL/);
});
test('Remote test targets must be complete HTTP origins without credentials or paths',()=>{
 for(const target of ['not-a-url','file:///tmp/test','https://example.invalid/path','https://example.invalid?query=secret','https://user:secret@example.invalid']){
  const result=run(target);assert.equal(result.status,2,target);assert.match(result.stderr,/origine http/);assert.ok(!result.stderr.includes('secret'));
 }
});
