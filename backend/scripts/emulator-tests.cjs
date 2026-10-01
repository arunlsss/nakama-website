const {spawn}=require('node:child_process'),path=require('node:path');
// Always use the demo project. Stop the entire process group if startup or tests stall.
const timeout=Number(process.env.NKM_EMULATOR_TIMEOUT_MS)||180000;
const child=spawn(process.execPath,[process.env.NKM_TEST_FIREBASE_CLI||require.resolve('firebase-tools/lib/bin/firebase.js'),'emulators:exec','--project','demo-nakama','--only','auth,firestore,storage','node tests/emulator.test.cjs'],{cwd:path.join(__dirname,'..'),stdio:'inherit',detached:process.platform!=='win32'});
let timedOut=false,killTimer;
function signal(sig){try{if(process.platform==='win32')child.kill(sig);else process.kill(-child.pid,sig);}catch{}}
const watchdog=setTimeout(()=>{timedOut=true;console.error('Emulator startup/tests exceeded '+timeout/1000+' seconds. Stopping.');signal('SIGTERM');killTimer=setTimeout(()=>signal('SIGKILL'),3000);killTimer.unref();},timeout);
child.on('exit',(code,sig)=>{clearTimeout(watchdog);if(timedOut)signal('SIGKILL');if(killTimer)clearTimeout(killTimer);process.exitCode=timedOut?124:code===null?1:code;});child.on('error',e=>{clearTimeout(watchdog);console.error(e.message);process.exitCode=1;});
process.on('SIGINT',()=>signal('SIGINT'));process.on('SIGTERM',()=>signal('SIGTERM'));
