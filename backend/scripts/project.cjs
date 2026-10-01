const fs=require('node:fs'),path=require('node:path'),C=require('../functions/lib/core');
module.exports=id=>{C.project(id);const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'../nakama-project.json'),'utf8')).projectId;if(expected!==id)throw Error('Project differs from the configured dedicated Nakama project.');return id;};
