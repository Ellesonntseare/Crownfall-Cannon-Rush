const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { chromium } = require('playwright');

// Exercise the shipped game in a browser. Test hooks exist only in the served copy.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
for (const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
const gameSource=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');new vm.Script(gameSource);
const instrumented = gameSource.replace('let previous=performance.now();', `
window.testGame={
 snapshot:()=>({state,levelIndex,waveIndex,time,upgrades:{...upgrades},checkpoint}),
 clearWave:()=>{health=0;finish(true)},
 lose:()=>finish(false),
 gateGrowth,gateResult,previewGateChain,unit,units,absorbHit,
 clearScene,makeEnemy,enemies,enemyShots,chooseEnemyTarget,updateEnemyTactics,updateEnemyAttacks,chooseBossLanes,pauseGame,resumeGame,reset:()=>buildLevel(levelIndex),
 predictTroopX,enemyTargetX,setTestLevel:index=>{levelIndex=index;waveIndex=0;buildLevel(index)},
 updateCannonMovement,resetCannonInput,
 resetMotion:()=>{cannon.position.x=0;resetCannonInput()},
 motion:()=>({x:cannon.position.x,aim,velocity:cannonVelocity,keys:heldMoveKeys.size,dragPointer}),
 damage:()=>{boss.enabled=false;health=100;strikeCastle({attack:3,x:0});return 100-health},
 interval:()=>{fire();return shotTimer},
 baseInterval:()=>LEVELS[levelIndex].fire,
};
let previous=performance.now();`);

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CROWNFALL_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:1100,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://crownfall.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1)||'index.html';const types={'index.html':'text/html','game.js':'text/javascript','vendor-bundle.js':'text/javascript','styles.css':'text/css'};return types[file]?route.fulfill({contentType:types[file],body:file==='game.js'?instrumented:fs.readFileSync(path.join(__dirname,'..',file),'utf8')}):route.fulfill({status:404,body:''})});
 await page.goto('http://crownfall.test/');
 await page.waitForFunction(()=>window.testGame);
 await page.click('#play');
 const motion=await page.evaluate(()=>{
  const t=testGame;
  function key(type,name,repeat=false){window.dispatchEvent(new KeyboardEvent(type,{key:name,repeat}))}
  function hold(fps,seconds){for(let i=0;i<fps*seconds;i++)t.updateCannonMovement(1/fps)}
  t.resetMotion();key('keydown','ArrowRight');t.updateCannonMovement(1/60);const first=t.motion().x;
  t.updateCannonMovement(1/60);const accelerated=t.motion().x-first>first;
  hold(60,.4);const beforeRelease=t.motion();key('keyup','ArrowRight');
  hold(60,1);const settled=t.motion();const braking=settled.x>beforeRelease.x&&Math.abs(settled.x-settled.aim)<.001&&Math.abs(settled.velocity)<.01;
  const rates=[];for(const fps of [30,60,120]){t.resetMotion();key('keydown','ArrowRight');hold(fps,.5);rates.push(t.motion().x);key('keyup','ArrowRight')}
  const consistent=Math.max(...rates)-Math.min(...rates)<.005;
  t.resetMotion();key('keydown','D');key('keydown','D',true);hold(60,2);const bounded=t.motion().x<=3.65&&t.motion().x>3.6;key('keyup','D');
  t.resetMotion();key('keydown','a');key('keydown','ArrowRight');hold(60,.5);const opposing=t.motion().x===0;
  key('keyup','a');hold(60,.2);const resumesRight=t.motion().x>0;
  t.pauseGame();const paused=t.motion();t.updateCannonMovement(.5);const pauseStops=t.motion().x===paused.x&&paused.velocity===0&&paused.keys===0;t.resumeGame();
  t.resetMotion();key('keydown','ArrowLeft');hold(60,.2);window.dispatchEvent(new Event('blur'));const blur=t.motion();hold(60,.5);const blurStops=t.motion().x===blur.x&&blur.velocity===0&&blur.keys===0;
  t.resetMotion();return {accelerated,braking,consistent,bounded,opposing,resumesRight,pauseStops,blurStops};
 });
 assert.deepEqual(motion,{accelerated:true,braking:true,consistent:true,bounded:true,opposing:true,resumesRight:true,pauseStops:true,blurStops:true});
 const fieldBox=await page.locator('#battlefield').boundingBox();await page.mouse.move(fieldBox.x+fieldBox.width*.3,fieldBox.y+fieldBox.height*.7);const beforePointer=await page.evaluate(()=>testGame.motion());await page.mouse.down();
 const down=await page.evaluate(()=>testGame.motion());assert.equal(down.aim,beforePointer.aim);
 await page.mouse.move(fieldBox.x+fieldBox.width*.6,fieldBox.y+fieldBox.height*.7);const dragged=await page.evaluate(()=>testGame.motion());assert.ok(dragged.aim>down.aim);
 await page.mouse.up();assert.equal((await page.evaluate(()=>testGame.motion())).dragPointer,null);
 await page.evaluate(()=>testGame.resetMotion());
 const smarter=await page.evaluate(()=>{
  const t=testGame;
  t.setTestLevel(1);t.clearScene();t.makeEnemy(-1.5,-15);t.unit(-.3,-6);
  const guard=t.enemies[0],troop=t.units[0];
  const forecast=t.enemyTargetX(guard,troop);
  const predictedRoute=forecast<-2&&troop.x>guard.position.x;
  t.updateEnemyTactics(.1);const interceptsAhead=guard.position.x<-1.5;
  t.clearScene();t.makeEnemy(-2.5,-20,true);t.unit(-.2,-3);
  const archer=t.enemies[0];archer.userData.cooldown=0;
  t.updateEnemyTactics(.1);t.updateEnemyAttacks(.1);
  const leadsRoute=archer.userData.charge===1.25&&archer.userData.lockedX===-2.5;
  t.setTestLevel(0);
  t.clearScene();t.makeEnemy(0,-20);t.makeEnemy(0,-20);t.unit(.4,-14);t.unit(-.4,-14);
  t.updateEnemyTactics(.1);
  const dividesTargets=t.enemies[0].userData.target!==t.enemies[1].userData.target&&t.enemies.every(e=>!!e.userData.target);
  const passed=t.enemies[0].userData.target;passed.z=-22;
  t.updateEnemyTactics(.01);const dropsPassed=t.enemies.every(e=>e.userData.target!==passed);
  t.clearScene();t.makeEnemy(0,-20);t.unit(1.5,-19.8);
  const skipsImpossible=t.chooseEnemyTarget(t.enemies[0])===null;
  t.clearScene();t.makeEnemy(0,-20);t.unit(.2,-14);t.unit(-.2,-14);t.units[1].attack=3;
  const prioritizesDamage=t.chooseEnemyTarget(t.enemies[0])===t.units[1];
  t.clearScene();t.makeEnemy(0,-20,true);t.makeEnemy(.2,-20,true);t.unit(.1,-2);
  t.enemies.forEach(e=>e.userData.cooldown=0);t.updateEnemyAttacks(.1);
  const reservesLanes=t.enemies.filter(e=>e.userData.charge>0).length===1;
  t.clearScene();for(const x of [-3,0,3]){t.makeEnemy(x,-20,true);t.unit(x,-2)}
  t.enemies.forEach(e=>e.userData.cooldown=0);t.updateEnemyAttacks(.1);
  const capsAttacks=t.enemies.filter(e=>e.userData.charge>0).length===2;
  t.clearScene();t.makeEnemy(0,-20,true);t.unit(0,-2);t.enemies[0].userData.cooldown=0;t.updateEnemyAttacks(.1,true);
  const respectsBoss=t.enemies[0].userData.charge===0;
  t.setTestLevel(0);
  return {predictedRoute,interceptsAhead,leadsRoute,dividesTargets,dropsPassed,skipsImpossible,prioritizesDamage,reservesLanes,capsAttacks,respectsBoss};
 });
 assert.deepEqual(smarter,{predictedRoute:true,interceptsAhead:true,leadsRoute:true,dividesTargets:true,dropsPassed:true,skipsImpossible:true,prioritizesDamage:true,reservesLanes:true,capsAttacks:true,respectsBoss:true});
 const ai=await page.evaluate(()=>{
  const t=testGame;t.clearScene();t.makeEnemy(0,-20);t.unit(1,-14);const guard=t.enemies[0];
  const target=t.chooseEnemyTarget(guard)===t.units[0];t.updateEnemyTactics(.2);const moved=guard.position.x>0&&guard.position.x<=.3;
  t.pauseGame();const before=guard.position.x;t.updateEnemyTactics(1);const paused=before===guard.position.x;t.resumeGame();
  t.clearScene();t.makeEnemy(0,-20,true);const archer=t.enemies[0];archer.userData.cooldown=0;t.updateEnemyAttacks(.1);const idle=archer.userData.charge===0;
  t.unit(.1,-2);t.unit(.2,-3);t.updateEnemyAttacks(.1);const charged=archer.userData.charge===1.25;const locked=archer.userData.lockedX;
  t.units.forEach(a=>a.x=3);t.updateEnemyTactics(.5);const committed=archer.position.x===locked&&archer.userData.warning.position.x===locked;
  t.updateEnemyAttacks(1.3);const shotMatches=t.enemyShots.length===1&&t.enemyShots[0].x===locked;
  t.clearScene();for(let i=0;i<4;i++)t.unit(3,-10);t.unit(-3,-10);const boss=t.chooseBossLanes(2);
  t.reset();return {target,moved,paused,idle,charged,committed,shotMatches,boss};
 });
 assert.deepEqual(ai,{target:true,moved:true,paused:true,idle:true,charged:true,committed:true,shotMatches:true,boss:[3,0]});
 const gateResults=await page.evaluate(()=>{
  const t=testGame;t.unit(0,8);const a=t.units.at(-1);
  const gate={row:0,lane:'left',spec:{kind:'add',value:3}};
  const first=t.gateGrowth(a,gate);t.unit(0,7,0,1,a);const child=t.units.at(-1);
  const repeat=t.gateGrowth(child,gate);
  const next=t.gateGrowth(child,{...gate,row:1});
  t.unit(0,8);const independent=t.gateGrowth(t.units.at(-1),gate);
  return [first,repeat,next,independent,t.gateGrowth(child,{spec:{kind:'multiply',value:3}})];
 });
 assert.deepEqual(gateResults,[3,0,3,3,2]);
 const maths=await page.evaluate(()=>{
  const t=testGame;
  function chain(specs){t.unit(0,8);let squad=[t.units.at(-1)];for(let row=0;row<specs.length;row++){const gate={row,lane:'left',spec:specs[row]};const entrants=[...squad];for(const a of entrants){const n=t.gateGrowth(a,gate);for(let i=0;i<n;i++){t.unit(0,7,0,1,a);squad.push(t.units.at(-1))}}}return squad.length}
  const add={kind:'add',value:3},mul={kind:'multiply',value:2};
  return {addThenMultiply:chain([add,mul]),multiplyThenAdd:chain([mul,add]),twoAdds:chain([add,add]),left:t.previewGateChain(-2.28).count,right:t.previewGateChain(2.28).count};
 });
 assert.deepEqual(maths,{addThenMultiply:8,multiplyThenAdd:5,twoAdds:7,left:5,right:8});
 await page.setViewportSize({width:390,height:640});
 await page.screenshot({path:path.join(__dirname,'maths-mobile.png')});
 assert.equal(await page.locator('#aim-feedback').evaluate(el=>el.getBoundingClientRect().left>=0&&el.getBoundingClientRect().right<=innerWidth),true);
 await page.setViewportSize({width:1100,height:800});
 await page.evaluate(()=>testGame.clearWave());
 await page.waitForSelector('#upgrade-screen:not(.hidden)');
 const frozen=await page.evaluate(()=>testGame.snapshot().time);
 await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>testGame.snapshot().time),frozen);
 await page.screenshot({path:path.join(__dirname,'upgrade-desktop.png')});
 // Reload before choosing: the pending reward must still be offered.
 await page.reload();await page.click('#play');
 await page.waitForSelector('#upgrade-screen:not(.hidden)');
 await page.getByRole('button',{name:/Rapid loader/}).click();
 let snap=await page.evaluate(()=>testGame.snapshot());
 assert.equal(snap.waveIndex,1);assert.equal(snap.upgrades.rapid,1);
 assert.equal(await page.evaluate(()=>testGame.interval()),await page.evaluate(()=>testGame.baseInterval()/1.25));
 await page.evaluate(()=>testGame.lose());await page.click('#play');
 assert.equal((await page.evaluate(()=>testGame.snapshot())).upgrades.rapid,1);
 await page.reload();await page.click('#play');
 assert.equal((await page.evaluate(()=>testGame.snapshot())).upgrades.rapid,1);
 await page.evaluate(()=>testGame.clearWave());await page.waitForSelector('#upgrade-screen:not(.hidden)');
 await page.setViewportSize({width:390,height:640});
 await page.screenshot({path:path.join(__dirname,'upgrade-mobile.png')});
 assert.equal(await page.locator('#upgrade-screen').evaluate(el=>el.scrollWidth<=innerWidth),true);
 await page.getByRole('button',{name:/Reinforced shields/}).click();
 assert.deepEqual(await page.evaluate(()=>{testGame.unit(0,8);const a=testGame.units.at(-1);return [a.armor,testGame.absorbHit(a),testGame.absorbHit(a)]}),[1,true,false]);
 await page.evaluate(()=>testGame.clearWave());await page.click('#play');
 snap=await page.evaluate(()=>testGame.snapshot());
 assert.equal(snap.levelIndex,1);assert.deepEqual(snap.upgrades,{rapid:0,armor:0,power:0});
 await page.evaluate(()=>testGame.clearWave());await page.waitForSelector('#upgrade-screen:not(.hidden)');
 await page.getByRole('button',{name:/Siege training/}).click();
 assert.equal(await page.evaluate(()=>testGame.damage()),4);
 await page.reload();await page.click('#restart');
 assert.deepEqual((await page.evaluate(()=>testGame.snapshot())).upgrades,{rapid:0,armor:0,power:0});
 assert.deepEqual(errors,[]);
 console.log('PASS: smooth steering, acceleration and braking, consistent refresh rates, relative dragging, input reset on pause and blur, route interception, coordinated targets and firing lanes, committed warnings, boss crowd targeting, gate maths, upgrades, checkpoints, mobile fit, and no browser errors.');
 } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
