'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const sources=['assets/js','netlify/functions','scripts'].flatMap(dir=>files(path.join(root,dir))).filter(file=>/\.(?:js|cjs)$/.test(file));
for(const file of sources)execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(__dirname,'check-api-hardening-wrapper.js')],{stdio:'inherit'});
console.log(`Syntaxe validée : ${sources.length} fichiers.`);
