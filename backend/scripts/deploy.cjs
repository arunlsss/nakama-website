const {spawnSync}=require('node:child_process'),path=require('node:path'),args=process.argv.slice(2),i=args.indexOf('--project'),id=i>=0?args[i+1]:undefined;
try{
 require('./project.cjs')(id);const access=require('./browser-access.cjs');access.checkCli();
 const deployed=spawnSync(process.execPath,[require.resolve('firebase-tools/lib/bin/firebase.js'),'deploy','--project',id,'--only','functions:nakama,firestore,storage'],{cwd:path.join(__dirname,'..'),stdio:'inherit',env:{...process.env,NKM_DEPLOY_PROJECT:id}});
 if(deployed.error)throw deployed.error;
 if(deployed.status!==0){process.exitCode=deployed.status===null?1:deployed.status;console.error('If only the six new account functions failed to set their invoker, run npm run browser-access -- --project '+id+' to configure their already-created services, then retry this deploy. For other deployment failures, resolve the reported error first.');}
 else{access.configureBrowserAccess(id);console.log('Nakama deployment complete.');}
}catch(e){console.error(e.message);process.exitCode=1;}
