const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const groups={backend:['backend/tests','.test.js'],frontend:['frontend/tests','.test.mjs'],'print-agent':['print-agent/tests','.test.js']};
const [group='all',...filters]=process.argv.slice(2);
if(group!=='all'&&!groups[group])throw new Error('Chọn all, backend, frontend hoặc print-agent.');
const files=Object.entries(groups).filter(([key])=>group==='all'||key===group).flatMap(([, [folder,suffix]])=>fs.readdirSync(path.join(__dirname,folder)).filter(name=>name.endsWith(suffix)&&(!filters.length||filters.some(filter=>name.startsWith(filter)))).map(name=>path.join(__dirname,folder,name)));
if(!files.length)throw new Error('Không tìm thấy file kiểm thử phù hợp.');
// Unit tests use legacy mode; explicit tenancy tests still set their own context.
// Never load or execute migration/seed scripts as test entry points.
const result=spawnSync(process.execPath,['--test','--test-concurrency=1',...files],{cwd:path.resolve(__dirname,'..'),env:{...process.env,SAAS_ENABLED:'false'},stdio:'inherit',windowsHide:true});
if(result.error){console.error(result.error.message);process.exitCode=1;}else process.exitCode=result.status ?? 1;
