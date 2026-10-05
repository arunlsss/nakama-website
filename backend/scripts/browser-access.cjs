const {spawnSync}=require('node:child_process');
const accountFunctions=['nkmAccountProfile','nkmAccounts','nkmLinkUserId','nkmRegister','nkmReviewAccount','nkmUserLogin'],region='asia-southeast1';
function checkCli(){const cli=spawnSync('gcloud',['--version'],{encoding:'utf8'});if(cli.error||cli.status!==0)throw Error('Install the Google Cloud CLI and run gcloud auth login before configuring account browser access.');}
function configureBrowserAccess(projectId){
 require('./project.cjs')(projectId);checkCli();
 // Domain-restricted projects cannot add allUsers. This supported service setting
 // opens browser transport without granting IAM roles or changing organization policy.
 // Firebase's callable handler still verifies tokens and enforces account/role checks.
 for(const name of accountFunctions){
  const metadata=spawnSync('gcloud',['functions','describe',name,'--gen2','--project',projectId,'--region',region,'--format=value(serviceConfig.service)'],{encoding:'utf8'});
  if(metadata.error)throw metadata.error;if(metadata.status!==0){if(metadata.stderr)console.error(metadata.stderr.trim());throw Error('Service lookup failed for '+name+'. Check your gcloud account and deploy this function first.');}
  const service=metadata.stdout.trim().split('/').at(-1);if(!/^[a-z][a-z0-9-]{0,62}$/.test(service))throw Error('No valid Cloud Run service was found for '+name+'.');
  const access=spawnSync('gcloud',['run','services','update',service,'--project',projectId,'--region',region,'--no-invoker-iam-check','--quiet'],{stdio:'inherit'});
  if(access.error)throw access.error;if(access.status!==0)throw Error('Browser access setup failed for '+name+'. Cloud Run Admin permission is required. If an organization policy requires the IAM invoker check, contact its administrator; no organization policy was changed.');
  console.log('Browser access configured: '+name);
 }
 console.log('Account browser access ready. Firebase login, email verification and workspace roles remain enforced.');
}
module.exports={configureBrowserAccess,checkCli};
if(require.main===module){const args=process.argv.slice(2),i=args.indexOf('--project');try{configureBrowserAccess(i>=0?args[i+1]:undefined);}catch(e){console.error(e.message);process.exitCode=1;}}
