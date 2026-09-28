'use strict';
// Delivery encoding only: the paintings are generated with imagegen and kept
// intact as PNG masters. sips is the native macOS image encoder.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const manifest=require('../docs/serments-art-prompts.json');
let count=0;
for(const asset of manifest.assets){
  const input=path.join(root,asset.path);
  if(!fs.existsSync(input)) continue;
  for(const [suffix,size] of [['',768],['-thumb',128]]){
    const output=input.replace(/\.png$/,suffix+'.jpg');
    if(fs.existsSync(output)&&fs.statSync(output).mtimeMs>=fs.statSync(input).mtimeMs) continue;
    execFileSync('/usr/bin/sips',['-Z',String(size),'-s','format','jpeg','-s','formatOptions','82',input,'--out',output],{stdio:'ignore'});
  }
  count++;
}
console.log(count+' peintures encodées pour le catalogue et le combat ; originaux PNG conservés.');
