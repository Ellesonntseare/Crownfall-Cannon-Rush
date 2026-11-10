const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8').replace('let previous=performance.now();',`
window.campaignTest={
 start:()=>{muted=true;clearCheckpoint();levelIndex=0;waveIndex=0;upgrades=freshUpgrades();startLevel()},
 runFortress:()=>{
  const stage=levelIndex;let elapsed=0,completedWaves=0,largestCrew=0;
  for(let i=0;i<7000;i++){
   if(state==='playing'){
    const left=previewGateChain(-2.28),right=previewGateChain(2.28),branch=LEVELS[levelIndex].branch;
    const side=boss.enabled?boss.openSide:(left.count*((branch?.left.damage||1)+upgrades.power)>right.count*((branch?.right.damage||1)+upgrades.power)?-1:1);
    if(Math.abs(aim-side*2.28)>.1)chooseRoute(side);
   }
   if(state==='upgrading'){completedWaves++;chooseUpgrade(waveIndex===0?'power':'armor')}
   if(state==='lose')return {stage,state,health,time,elapsed,completedWaves};
   if(state==='between'||state==='complete')return {stage,state,elapsed,completedWaves:completedWaves+1,largestCrew};
   stepGame(.05);elapsed+=.05;largestCrew=Math.max(largestCrew,units.length);
  }
  return {stage,state,health,time,elapsed,completedWaves};
 },next:activatePlay,
 snapshot:()=>({state,levelIndex,waveIndex,health,time,units:units.length,drawCalls:renderer.info.render.calls,sprite:units[0]?.rig.sprite?.isSprite}),
};
let previous=performance.now();`);

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CROWNFALL_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://crownfall.test/**',route=>{
   const file=new URL(route.request().url()).pathname.slice(1)||'index.html';
   const types={'index.html':'text/html','game.js':'text/javascript','styles.css':'text/css','vendor-bundle.js':'text/javascript'};
   return types[file]?route.fulfill({contentType:types[file],body:file==='game.js'?source:fs.readFileSync(path.join(root,file),'utf8')}):route.fulfill({status:404,body:''});
  });
  await page.goto('http://crownfall.test/');await page.waitForFunction(()=>window.campaignTest);
  await page.evaluate(()=>campaignTest.start());
  for(let stage=0;stage<12;stage++){
   const result=await page.evaluate(()=>campaignTest.runFortress());
   console.log(JSON.stringify(result));
   assert.equal(result.stage,stage);assert.equal(result.completedWaves,3);
   assert.equal(result.state,stage===11?'complete':'between');assert.ok(result.largestCrew<=135);
   if(stage!==11)await page.evaluate(()=>campaignTest.next());
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: all 12 fortresses / 36 waves completed through real combat, with route choices and earned upgrades; no forced victories, browser errors, or crew cap violations.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
