'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../assets/js/main.js'),'utf8');
const handler=source.slice(source.indexOf('async function archiveSysLog(){'),source.indexOf('function downloadArchive('));
function fixture(){
 const state={log:[{ts:1,detail:'Archived log'}],players:[{id:'p',name:'Player',classe:'Mizu',history:[{ts:1,text:'Archived history'}]}],archives:[],notices:[],writes:[]};
 const clone=v=>JSON.parse(JSON.stringify(v));
 const context={_LOG_KEY:'np_syslog',_dbVersions:{np_syslog:'old-log',players:'old-players'},_cloneForDb:clone,getSysLog:()=>state.log,gp:()=>state.players,getSysLogArchive:()=>state.archives,esc:s=>s,confirm:()=>true,notif:(message,type)=>state.notices.push({message,type}),renderDatabase:()=>{},saveSysLogArchive:async a=>{state.archives=clone(a);state.writes.push('archive');},saveSysLog:async a=>{state.log=clone(a);state.writes.push('log');},sp:async a=>{state.players=clone(a);state.writes.push('players');}};
 vm.createContext(context);vm.runInContext(handler,context);return {state,context};
}
test('System archive stores log and histories before clearing them',async()=>{
 const {state,context}=fixture();await context.archiveSysLog();
 assert.deepEqual(state.writes,['archive','log','players']);assert.equal(state.archives[0].entries.length,2);assert.equal(state.players[0].history.length,0);assert.ok(state.notices.some(n=>n.type==='ok'));
});
test('A log arriving during archive save is kept in the active log',async()=>{
 const {state,context}=fixture();const save=context.saveSysLogArchive;context.saveSysLogArchive=async a=>{await save(a);state.log.unshift({ts:2,detail:'New log'});context._dbVersions.np_syslog='new-log';};
 await context.archiveSysLog();assert.deepEqual(state.writes,['archive']);assert.equal(state.log[0].detail,'New log');assert.equal(state.players[0].history.length,1);assert.ok(!state.notices.some(n=>n.type==='ok'));
});
test('A history arriving after archive save is not cleared unarchived',async()=>{
 const {state,context}=fixture();const save=context.saveSysLog;context.saveSysLog=async a=>{await save(a);state.players[0].history.unshift({ts:2,text:'New history'});context._dbVersions.players='new-players';};
 await context.archiveSysLog();assert.deepEqual(state.writes,['archive','log']);assert.equal(state.players[0].history[0].text,'New history');assert.ok(!state.notices.some(n=>n.type==='ok'));
});
