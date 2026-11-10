(() => {
'use strict';
try {
const $ = (q) => document.querySelector(q);
const ui = {overlay:$('#overlay'), hud:$('#hud'), army:$('#army'), hp:$('#hp'), timer:$('#timer'), progress:$('#progress'), hint:$('#hint'), sound:$('#sound'), threat:$('#threat'), aim:$('#aim-feedback'), level:$('#level'), hpTotal:$('#hp-total'), encounter:$('#encounter'),wave:$('#wave'),pause:$('#pause'),restart:$('#restart')};
const W=9.6, START=8.3, END=-37, MAX=135;
let waveReport={shots:0,grown:0,lost:0,damage:0};
function setPlayUi(visible){for(const id of ['battle-controls','field-notes','pause'])$('#'+id).classList.toggle('hidden',!visible)}
function chooseRoute(side){if(state!=='playing')return;resetCannonInput();aim=side*2.28;$('#hint').classList.add('hidden')}
function showHint(text,seconds=5){clearTimeout(hintTimeout);ui.hint.textContent=text;ui.hint.classList.remove('hidden');hintTimeout=setTimeout(()=>ui.hint.classList.add('hidden'),seconds*1000)}

const scene = new THREE.Scene(); scene.background=new THREE.Color(0x78b5cc); scene.fog=new THREE.FogExp2(0x78b5cc,0.0045);
scene.scale.set(1.35,1,.36);
const camera=new THREE.OrthographicCamera(-16,16,14.8,-9.2,.1,240);camera.position.set(0,34,31);camera.lookAt(0,0,-5);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=false; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.95; $('#battlefield').append(renderer.domElement);
const ambient=new THREE.HemisphereLight(0xfff2da,0x3b8aaa,.95); scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffe6ab,1.25); sun.position.set(-15,28,12); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-33;sun.shadow.camera.right=33;sun.shadow.camera.top=44;sun.shadow.camera.bottom=-44;sun.shadow.camera.near=1;sun.shadow.camera.far=100; sun.shadow.bias=-.00035;scene.add(sun);
const mat=(c,metal=0,rough=.75)=>new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough});
const M={water:mat(0x378eaa,.24,.4),stone:mat(0xc5d5d2,.04,.78),stoneDark:mat(0x84a6ac,.12,.77),edge:mat(0xf5c971,.58,.3),grass:mat(0x51aa7d),deepGrass:mat(0x327d68),navy:mat(0x1d3556,.58,.31),navyLight:mat(0x325378,.47,.4),copper:mat(0xd99b48,.74,.25),gold:mat(0xf9d87b,.7,.23),teal:mat(0x25d8cf,.26,.28),blue:mat(0x278bc4,.22,.38),blueDark:mat(0x155878,.25,.4),red:mat(0xc65252,.17,.5),redDark:mat(0x823c49,.13,.55),skin:mat(0xf2c199),cream:mat(0xf9f4df),shadow:mat(0x466277)};
const box=(w,h,d,m,x=0,y=0,z=0,parent=scene)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
const cyl=(rt,rb,h,m,x=0,y=0,z=0,parent=scene,n=16)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
const sphere=(r,m,x=0,y=0,z=0,parent=scene,seg=12)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,seg,10),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o};
const torus=(r,t,m,x,y,z,parent=scene)=>{const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,24),m);o.position.set(x,y,z);parent.add(o);return o};
const label=(text,color='#ecffff',bg='#174f70',w=256,h=100)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=bg;g.beginPath();g.roundRect(5,5,w-10,h-10,25);g.fill();g.lineWidth=7;g.strokeStyle='#d2f5f0';g.stroke();g.fillStyle=color;g.font=`900 ${text.length>9?38:58}px system-ui`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+2);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;const o=new THREE.Mesh(new THREE.PlaneGeometry(3.05,1.2),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide,depthWrite:false}));o.userData.ownedMaterial=true;return o};
// Water, floating road, gilded edge, and distant garden islands.
box(200,.1,200,M.water,0,-1.72,-18).receiveShadow=false;
box(W+.95,1.8,54,M.stoneDark,0,-.85,-13);box(W, .22,53.5,M.stone,0,.08,-13);
for(const x of [-W/2-.18,W/2+.18]){box(.25,.22,54,M.edge,x,.31,-13);for(let z=10;z>-40;z-=2.7)box(.37,.12,.62,M.gold,x,.48,z)}
for(let z=8;z>-39;z-=4.5){box(W-.55,.022,.055,M.cream,0,.205,z);for(let x of [-3.95,3.95])sphere(.1,M.gold,x,.26,z)}
for(let i=0;i<11;i++){const side=i%2?-1:1,z=9-i*4.6,x=side*(9.2+(i%3)*2.4);cyl(1.4,1.65,.7,M.grass,x,-.88,z);cyl(.82,1.2,.5,M.deepGrass,x,-.36,z);cyl(.15,.22,1.7,M.copper,x,.3,z);sphere(.92,i%3?M.grass:M.teal,x,1.2,z);sphere(.55,M.grass,x+.65,1.55,z-.2)}
for(let i=0;i<16;i++){const z=-32+Math.random()*90, x=(i%2?-1:1)*(19+Math.random()*25);const cloud=new THREE.Group();for(let j=0;j<3;j++)sphere(1.4+Math.random()*.9,M.cream,(j-1)*1.25,Math.random()*.3,0,cloud);cloud.position.set(x,7+Math.random()*7,z);scene.add(cloud)}
// The cannon uses layered metal parts and embossed rings.
const cannon=new THREE.Group();scene.add(cannon);cannon.position.set(0,0,12.05);
const base=cyl(1.55,1.78,.42,M.navy,0,.30,0,cannon,32);cyl(1.4,1.55,.15,M.gold,0,.58,0,cannon,32);
const cannonWheels=[];
for(const x of [-1.43,1.43]){const rig=new THREE.Group();rig.position.set(x,.78,.18);cannon.add(rig);cannonWheels.push(rig);const wheel=cyl(.76,.76,.3,M.navy,0,0,0,rig,24);wheel.rotation.z=Math.PI/2;const rim=torus(.69,.12,M.gold,x>0?.17:-.17,0,0,rig);rim.rotation.y=Math.PI/2;for(let a=0;a<8;a++){const spoke=box(.05,1.2,.07,M.copper,x>0?.18:-.18,0,0,rig);spoke.rotation.x=a*Math.PI/4}}
const gun=new THREE.Group();cannon.add(gun);
const barrel=cyl(.68,.9,2.75,M.navy,0,1.17,-1.05,gun,24);barrel.rotation.x=-Math.PI/2;cyl(.79,.79,.24,M.copper,0,1.17,-2.38,gun,24).rotation.x=-Math.PI/2;cyl(.83,.83,.13,M.gold,0,1.17,-1.37,gun,24).rotation.x=-Math.PI/2;cyl(.87,.87,.17,M.copper,0,1.17,-.18,gun,24).rotation.x=-Math.PI/2;
for(const x of [-.68,.68])box(.14,.17,1.6,M.copper,x,.8,-.2,cannon);
const muzzle=new THREE.PointLight(0x50e4fa,0,5);muzzle.position.set(0,1.17,-2.6);gun.add(muzzle);
const muzzleFlash=sphere(.6,new THREE.MeshBasicMaterial({color:0xd5ffff,transparent:true,opacity:.85}),0,1.17,-2.75,gun);muzzleFlash.visible=false;
let recoil=0,flashTime=0;
// Fortress, battlements, banners, and a glowing target crystal.
const fort=new THREE.Group();fort.position.z=-39.8;scene.add(fort);
const battlements=[];
box(11,1.1,6.2,M.stoneDark,0,.28,0,fort);box(9.8,6.6,4.4,M.stone,0,3.8,-.7,fort);box(10.2,.36,4.6,M.edge,0,7.15,-.7,fort);
for(let x=-4.5;x<=4.5;x+=1.5)battlements.push(box(.9,.72,4.65,M.stone,x,7.59,-.7,fort));
for(const x of [-4.7,4.7]){cyl(1.2,1.4,9.2,M.stoneDark,x,4.45,0,fort,8);cyl(1.55,1.55,.3,M.gold,x,9.05,0,fort,8);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(.6,.62,.6,M.stone,x+Math.cos(a)*1.08,9.5,Math.sin(a)*1.08,fort)}}
const doorMesh=box(2.4,3.3,.18,M.navy,0,1.9,1.59,fort);const doorLintel=box(2.85,.32,.45,M.gold,0,3.65,1.67,fort);
for(const x of [-2.7,2.7]){box(.85,1.6,.12,M.navy,x,4.8,1.57,fort);box(.74,.75,.15,M.teal,x,5,1.7,fort)}
const crystal=new THREE.Group();crystal.position.set(0,8.5,0);fort.add(crystal);cyl(.55,.55,.52,M.gold,0,-.55,0,crystal,8);const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.84),new THREE.MeshStandardMaterial({color:0x69f5f0,emissive:0x19b9d0,emissiveIntensity:1.2,metalness:.2,roughness:.2}));crystal.add(gem);
// Damage is shown on the castle itself, not only in the HUD.
const castleExtras=new THREE.Group();fort.add(castleExtras);
const stageDecor=new THREE.Group();scene.add(stageDecor);
const crackGroups=[];const crackMat=new THREE.MeshBasicMaterial({color:0x514e55});
function crack(x,y,points){const group=new THREE.Group();fort.add(group);let px=x,py=y;for(const [dx,dy] of points){const nx=x+dx,ny=y+dy,vector=new THREE.Vector3(nx-px,ny-py,0),len=vector.length();const seg=cyl(.055,.055,len,crackMat,(px+nx)/2,(py+ny)/2,1.74,group,6);seg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());px=nx;py=ny}group.visible=false;crackGroups.push(group)}
crack(-3.15,6.45,[[.2,-.5],[-.12,-1.05],[.34,-1.55],[.05,-2.05],[.58,-2.55]]);
crack(2.45,6.2,[[-.2,-.5],[.12,-1.1],[-.25,-1.6],[.02,-2.2],[-.45,-2.8]]);
crack(.3,6.92,[[.24,-.45],[-.05,-.95],[.35,-1.35],[.2,-1.9]]);
const wallFlash=new THREE.Mesh(new THREE.PlaneGeometry(9.7,6.5),new THREE.MeshBasicMaterial({color:0xffd18b,transparent:true,opacity:0,depthWrite:false}));wallFlash.position.set(0,3.8,1.78);fort.add(wallFlash);
const rubble=[];let fortHitCount=0,fortFlash=0;
function makeRubble(x,y,z,count=2){if(rubble.length>48)return;for(let i=0;i<count;i++){const piece=box(.16+Math.random()*.24,.14+Math.random()*.2,.17+Math.random()*.22,M.stoneDark,x+(Math.random()-.5)*1.3,y+(Math.random()-.5)*.6,z);rubble.push({piece,vx:(Math.random()-.5)*3,vy:1+Math.random()*2,vz:1+Math.random()*2,life:1.3+Math.random()*.6})}}
function fortressHit(x){fortHitCount++;fortFlash=Math.min(.8,fortFlash+.28);wallFlash.material.opacity=fortFlash*.55;shake=Math.max(shake,.08);const ratio=health/maxHealth;crackGroups.forEach((g,i)=>g.visible=ratio<1-(i+1)*.25);battlements.forEach((part,i)=>part.visible=ratio>.5||i%2===0&&ratio>.24);if(fortHitCount%4===0){const pos=fort.localToWorld(new THREE.Vector3(Math.max(-4,Math.min(4,x)),3.5+Math.random()*2,1.7));makeRubble(pos.x,pos.y,pos.z,2)}if(fortHitCount%5===0)beep(82,.2,'triangle',.055)}
function castleCollapse(){fortFlash=1;crackGroups.forEach(g=>g.visible=true);battlements.forEach(part=>part.visible=false);const pos=fort.localToWorld(new THREE.Vector3(0,5,1.7));makeRubble(pos.x,pos.y,pos.z,18);puff(pos.x,pos.y,pos.z,0xf8dfa7,14);shake=.38;beep(75,.65,'sawtooth',.09)}
function resetCastle(){fortHitCount=0;fortFlash=0;wallFlash.material.opacity=0;crackGroups.forEach(g=>g.visible=false);battlements.forEach(part=>part.visible=true);for(const item of rubble)removeObject(item.piece);rubble.length=0}

// Kenney Castle Kit models are CC0. Binary and texture data are bundled below the loader.
const premiumFort=new THREE.Group(),premiumDecor=new THREE.Group();fort.add(premiumFort);scene.add(premiumDecor);
const premiumModels={};let premiumReady=false;
function clearPremium(){while(premiumFort.children.length)premiumFort.remove(premiumFort.children[0]);while(premiumDecor.children.length)premiumDecor.remove(premiumDecor.children[0])}
function modelInstance(name,parent,x,y,z,scale,rotation=0){const source=premiumModels[name];if(!source)return;const o=source.clone(true);o.position.set(x,y,z);o.scale.setScalar(scale);o.rotation.y=rotation;o.traverse(child=>{if(child.isMesh){child.castShadow=false;child.receiveShadow=true}});parent.add(o);return o}
function placePremiumModels(index=levelIndex){if(!premiumReady)return;clearPremium();const tint=stageTheme(index)===1?0xffdfbe:stageTheme(index)===2?0xa7bad8:0xffffff;
 for(const source of Object.values(premiumModels))source.traverse(node=>{if(node.isMesh&&node.material){const materials=Array.isArray(node.material)?node.material:[node.material];for(const material of materials){if(!material.userData.originalColor)material.userData.originalColor=material.color.clone();material.color.copy(material.userData.originalColor).multiply(new THREE.Color(tint))}}});
 const towers=stageTheme(index)===2?[-6.3,-4.7,4.7,6.3]:[-4.7,4.7];
 for(const x of towers){const outer=Math.abs(x)>5;modelInstance('tower-square-mid-windows',premiumFort,x,outer?5.2:5.45,outer?-.4:.95,outer?1.2:1.35);modelInstance('tower-square-roof',premiumFort,x,outer?9.15:9.4,outer?-.4:.95,outer?1.2:1.35)}
 modelInstance('wall-doorway',premiumFort,0,2.1,1.6,1.55);
 for(const x of [-6.25,6.25]){const flag=modelInstance('flag-pennant',premiumFort,x,8.4,1.25,1.04);if(flag){flag.userData.flag=true;flag.userData.baseRotation=x<0?-.14:.14;flag.rotation.z=flag.userData.baseRotation}}
 for(const [x,z] of (index===0?[[7.4,-8]]:index===1?[[-7.4,-8],[7.4,-23]]:[[-7.4,-7],[7.4,-17],[-7.4,-26],[7.4,-34]])){modelInstance('siege-ballista',premiumDecor,x,.85,z,1.75,x<0?Math.PI*.2:-Math.PI*.2)}
 castleExtras.visible=false;doorMesh.visible=true;doorLintel.visible=false;
}
function loadPremiumModels(){if(typeof THREE.GLTFLoader!=='function'||!window.CROWNFALL_MODEL_DATA)return;
 const manager=new THREE.LoadingManager();manager.setURLModifier(url=>url.includes('colormap.png')?'data:image/png;base64,'+window.CROWNFALL_MODEL_TEXTURE:url);
 const loader=new THREE.GLTFLoader(manager),jobs=Object.entries(window.CROWNFALL_MODEL_DATA).map(([name,base64])=>new Promise((resolve,reject)=>{try{const raw=atob(base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);loader.parse(bytes.buffer,'',gltf=>{premiumModels[name]=gltf.scene;resolve()},reject)}catch(error){reject(error)}}));
 Promise.all(jobs).then(()=>{premiumReady=true;placePremiumModels()}).catch(error=>console.warn('Crownfall models unavailable; using built-in castle.',error));
}

// Stages introduce movement, route choices, and an alternating boss weak side.
const LEVELS=[
 {name:'Harbor Approach',time:42,hp:60,fire:.62,sky:0x78b5cc,fortScale:.84,water:0x378eaa,stone:0xc5d5d2,stoneDark:0x84a6ac,ground:0x51aa7d,groundDark:0x327d68,edge:0xf5c971,sun:0xffe6ab,sunPower:1.25,fog:.0045,
  rows:[{z:-5,left:{kind:'multiply',value:2},right:{kind:'add',value:3}},{z:-22,left:{kind:'add',value:3},right:{kind:'multiply',value:2}}],
  hazards:[],enemies:[[-3.2,-14],[-2.1,-14],[2.1,-14],[3.2,-14],[-2.3,-31],[2.3,-31]],
  hint:'DRAG TO LINE UP A GLOWING GATE'},
 {name:'Crosswinds',time:55,hp:105,fire:.52,sky:0xe8b98f,fortScale:.98,water:0x8e8d98,stone:0xe2c9a9,stoneDark:0xa98974,ground:0xc49b63,groundDark:0x8d704f,edge:0xffd189,sun:0xffb56e,sunPower:1.45,fog:.0055,
  rows:[{z:-4,left:{kind:'multiply',value:3,motion:.62,speed:1.3},right:{kind:'add',value:4}},
        {z:-16,left:{kind:'add',value:4},right:{kind:'multiply',value:2,motion:.5,speed:1.8,phase:1}},
        {z:-27,left:{kind:'multiply',value:2},right:{kind:'add',value:5}}],
  hazards:[{kind:'spikes',x:3.35,z:-10,width:.8},{kind:'sweeper',x:0,z:-22,width:1.5,motion:1.9,speed:1.5}],
  enemies:[[-3.4,-13],[-1.3,-13,1],[1.3,-13],[3.4,-13],[-3,-24],[-2,-24],[2,-24,1],[3,-24],[-3,-33],[0,-33],[3,-33]],
  branch:{entry:-7,exit:-14,left:{x:-2.5,damage:2,name:'GUARD'},right:{x:2.5,damage:3,name:'RAID'}},
  hint:'LEFT: GUARD ×2 DAMAGE · RIGHT: RAID ×3 DAMAGE'},
 {name:'The Citadel',time:65,hp:135,fire:.48,sky:0x7185a4,fortScale:1.09,water:0x364e76,stone:0x91a0b8,stoneDark:0x52617e,ground:0x657d91,groundDark:0x344e68,edge:0xd0a574,sun:0xbdd0ff,sunPower:1.08,fog:.007,
  rows:[{z:-4,left:{kind:'multiply',value:3,motion:.55,speed:1.5},right:{kind:'add',value:4}},
        {z:-16,left:{kind:'add',value:5},right:{kind:'multiply',value:3,motion:.65,speed:1.15,phase:1.8}},
        {z:-28,left:{kind:'multiply',value:2,motion:.5,speed:1.75,phase:2},right:{kind:'add',value:6}}],
  hazards:[{kind:'spikes',x:-3.7,z:-10,width:1.05},{kind:'sweeper',x:0,z:-21,width:1.65,motion:2.35,speed:1.7},{kind:'spikes',x:3.65,z:-33,width:.95}],
  enemies:[[-3.6,-12],[-2.5,-12,1],[-1.4,-12],[1.4,-12],[2.5,-12,1],[3.6,-12],[-3.3,-24],[-2.1,-24,1],[-.9,-24],[.9,-24],[2.1,-24,1],[3.3,-24],[-3.5,-35],[-2.2,-35,1],[-1,-35],[1,-35],[2.2,-35,1],[3.5,-35]],
  branch:{entry:-6,exit:-14,left:{x:-2.55,damage:3,name:'RAID'},right:{x:2.55,damage:2,name:'GUARD'}},
  hint:'CHOOSE A ROUTE · RAID TROOPS HIT HARDER'}
];
LEVELS.push(
 {...LEVELS[1],name:'Splitwater Crossing',time:64,hp:185,fire:.5,sky:0x8fc8bc,water:0x267f83,stone:0xc2d9c4,stoneDark:0x668c80,ground:0x6baf8e,groundDark:0x347866,sun:0xffe8bf,fortScale:1.02,
  rows:[{z:-3,left:{kind:'multiply',value:3,motion:.7,speed:1.2},right:{kind:'multiply',value:2,motion:.6,speed:1.2,phase:Math.PI}},
        {z:-19,left:{kind:'add',value:4,motion:.55,speed:1.6},right:{kind:'multiply',value:3}},
        {z:-29,left:{kind:'multiply',value:2},right:{kind:'add',value:6,motion:.6,speed:1.4}}],
  branch:{entry:-6,exit:-15,left:{x:-2.7,damage:2,name:'GUARD'},right:{x:2.7,damage:3,name:'RAID'}},
  hazards:[{kind:'spikes',x:2.7,z:-12,width:1.15},{kind:'sweeper',x:0,z:-24,width:1.55,motion:2.3,speed:1.5}],
  enemies:[[-3,-17],[-1.8,-17],[1.8,-17,1],[3,-17,1],[-3.2,-33],[-2,-33,1],[2,-33],[3.2,-33,1]],
  hint:'FOLLOW THE SPLIT PATHS · GUARD ×2 OR RAID ×3 DAMAGE'},
 {...LEVELS[2],name:'The Iron Crown',time:78,hp:260,fire:.46,boss:true,fortScale:1.15,sky:0x695c80,water:0x3c385f,stone:0xa69ab3,stoneDark:0x665975,edge:0xf1bd77,sun:0xffc2ac,
  branch:{entry:-6,exit:-14,left:{x:-2.6,damage:3,name:'RAID'},right:{x:2.6,damage:3,name:'RAID'}},
  hazards:[{kind:'sweeper',x:0,z:-21,width:1.45,motion:2.1,speed:1.3}],
  enemies:[[-3.2,-12],[-1.6,-12],[1.6,-12],[3.2,-12],[-3,-25,1],[-1.5,-25],[1.5,-25],[3,-25,1]],
  hint:'TEAL SIDE: FULL DAMAGE · RED SHIELDS: REDUCED DAMAGE · AVOID RED ATTACK LANES'}
);
const ironCrown=LEVELS.pop();
LEVELS.push(
 {...ironCrown,name:'Ember Bastion',theme:1,sky:0xc39084,water:0x785e66,stone:0xd6ad92,stoneDark:0x95675e,ground:0xa6845e,groundDark:0x6c5347,sun:0xffc098,fortScale:1.04},
 {...LEVELS[3],name:'Moonlit Canal',theme:2,sky:0x596d92,water:0x293f67,stone:0xa9bdd2,stoneDark:0x607896,ground:0x658a91,groundDark:0x355761,edge:0xd5d9a3,sun:0xc3d7ff,
  rows:[{z:-3,left:{kind:'multiply',value:3},right:{kind:'add',value:5,motion:.6,speed:1.4}},
        {z:-18,left:{kind:'multiply',value:2,motion:.6,speed:1.1},right:{kind:'multiply',value:3}},
        {z:-29,left:{kind:'add',value:5},right:{kind:'multiply',value:2,motion:.5,speed:1.7}}],
  hazards:[{kind:'sweeper',x:0,z:-23,width:1.4,motion:2.2,speed:1.1}],hint:'THREE WAVES · WATCH THE MOVING GATES UNDER MOONLIGHT'},
 {...LEVELS[2],name:'Frostwatch',theme:2,sky:0xa2c9da,water:0x578ba7,stone:0xe0ecee,stoneDark:0x8faeba,ground:0xb3d1d3,groundDark:0x6e9ca7,edge:0xe7d9ac,sun:0xd5efff,
  hazards:[{kind:'sweeper',x:0,z:-21,width:1.25,motion:2.15,speed:1.4},{kind:'spikes',x:3.8,z:-33,width:.75}],hint:'FROSTWATCH · READ THE SWEEPERS AND KEEP YOUR CREW MOVING'},
 {...ironCrown,name:'Stormkeep',theme:2,sky:0x535f7d,water:0x2a3d57,stone:0x9dabc0,stoneDark:0x4a5e79,ground:0x72858a,groundDark:0x3f5b63,sun:0xc7d9ff,fortScale:1.12,
  rows:[{z:-4,left:{kind:'multiply',value:3},right:{kind:'multiply',value:2}},
        {z:-17,left:{kind:'multiply',value:2,motion:.55,speed:1.4},right:{kind:'multiply',value:3}},
        {z:-28,left:{kind:'add',value:5},right:{kind:'multiply',value:2,motion:.6,speed:1.3}}]},
 {...LEVELS[3],name:'Sunken Ramparts',theme:0,sky:0x87b8a6,water:0x287b77,stone:0xb1c9b3,stoneDark:0x648978,ground:0x66a680,groundDark:0x306e59,sun:0xe4f0be,
  hazards:[{kind:'sweeper',x:0,z:-23,width:1.4,motion:2.25,speed:1.2}],hint:'RAMPARTS · FOLLOW THE GUARD OR RAID PATH THROUGH THREE WAVES'},
 {...LEVELS[2],name:'Cinder Reach',theme:1,sky:0xc48b7a,water:0x71505e,stone:0xc99f87,stoneDark:0x835c58,ground:0xb28c5e,groundDark:0x735243,edge:0xffcc83,sun:0xffbd83,
  rows:[{z:-4,left:{kind:'multiply',value:3,motion:.65,speed:1.2},right:{kind:'add',value:5}},
        {z:-17,left:{kind:'multiply',value:2},right:{kind:'multiply',value:3,motion:.7,speed:1.4}},
        {z:-28,left:{kind:'multiply',value:2},right:{kind:'add',value:6}}],hint:'CINDER REACH · TIME THE GOLDEN GATES TO REBUILD YOUR ARMY'},
 {...LEVELS[3],name:'Royal Causeway',theme:1,sky:0xc1b5d3,water:0x7074a2,stone:0xe4d4c1,stoneDark:0xa89ba9,ground:0x8eaf90,groundDark:0x547661,edge:0xffe099,sun:0xffe5be,fortScale:1.13,
  hazards:[{kind:'sweeper',x:0,z:-23,width:1.35,motion:2.2,speed:1.6}],hint:'THE FINAL APPROACH · CLEAR THREE DEFENDER WAVES'},
 {...ironCrown,theme:2}
);
const campaignHealth=[60,110,165,190,350,230,270,480,310,360,420,680];
LEVELS.forEach((level,i)=>{level.hp=campaignHealth[i];level.time=level.boss?100:75;level.waves=3;level.theme??=(i===3?0:i);
 // A committed branch must never steer an entire squad into an unavoidable spike bed.
 level.hazards=level.hazards.map(h=>h.kind==='spikes'&&level.branch&&h.z<=level.branch.entry&&h.z>=level.branch.exit?{...h,x:Math.sign(h.x||1)*3.85,width:Math.min(.65,h.width)}:{...h});});
const SAVE_KEY='crownfall-campaign-v1';
function readCheckpoint(){try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY));if(saved?.version===1&&Number.isInteger(saved.level)&&saved.level>=0&&saved.level<LEVELS.length&&Number.isInteger(saved.wave)&&saved.wave>=0&&saved.wave<LEVELS[saved.level].waves)return saved}catch(error){}return null}
function freshUpgrades(){return {rapid:0,armor:0,power:0}}
function validUpgrades(saved,wave){const result=freshUpgrades();let remaining=wave;for(const key of Object.keys(result)){const rank=saved?.[key];result[key]=Number.isInteger(rank)?Math.max(0,Math.min(2,rank,remaining)):0;remaining-=result[key]}return result}
let checkpoint=readCheckpoint();
let upgrades=validUpgrades(checkpoint?.upgrades,checkpoint?.wave||0);
const UPGRADE_OPTIONS=[
 {key:'rapid',name:'Rapid loader',detail:'Fire 25% faster per rank.'},
 {key:'armor',name:'Reinforced shields',detail:'Each troop absorbs one extra hit per rank.'},
 {key:'power',name:'Siege training',detail:'Each troop deals +1 fortress damage per rank.'}
];
function updateUpgradeHud(){const parts=UPGRADE_OPTIONS.filter(o=>upgrades[o.key]).map(o=>o.name+' '+upgrades[o.key]);$('#upgrade-status').textContent=parts.length?parts.join(' · '):'None yet. Earn one after this wave.'}
function showUpgradeChoice(){setPlayUi(false);state='upgrading';ui.overlay.classList.add('hidden');ui.hud.classList.add('hidden');ui.encounter.classList.add('hidden');ui.hint.classList.add('hidden');$('#upgrade-description').textContent=(waveReport.damage>0?waveReport.damage+' damage dealt. '+waveReport.grown+' troops recruited. ':'Checkpoint recovered. ')+'Choose your advantage for wave '+(waveIndex+2)+'.';const choices=$('#upgrade-choices');choices.replaceChildren();for(const option of UPGRADE_OPTIONS){const button=document.createElement('button');button.type='button';button.className='upgrade-choice';const title=document.createElement('strong'),detail=document.createElement('span');title.textContent=option.name+' · Rank '+(upgrades[option.key]+1);detail.textContent=option.detail;button.append(title,detail);button.addEventListener('click',()=>chooseUpgrade(option.key));choices.append(button)}$('#upgrade-screen').classList.remove('hidden');choices.querySelector('button').focus()}
document.addEventListener('keydown',e=>{if(state!=='upgrading'||e.key!=='Tab')return;const buttons=[...$('#upgrade-choices').querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus()});
function chooseUpgrade(key){if(state!=='upgrading'||!UPGRADE_OPTIONS.some(o=>o.key===key))return;upgrades[key]++;$('#upgrade-screen').classList.add('hidden');nextWave();ui.pause.focus();if(document.hidden)pauseGame()}
// A squad shares its addition claims through every descendant, with no global registry.
function gateResult(count,spec){return spec.kind==='multiply'?count*spec.value:count+spec.value}
function gateGrowth(a,gate){if(gate.spec.kind==='multiply')return gateResult(1,gate.spec)-1;const key=gate.row+':'+gate.lane;if(a.squad.additions.has(key))return 0;a.squad.additions.add(key);return gateResult(0,gate.spec)}
function absorbHit(a){if(a.armor<=0)return false;a.armor--;impact(a.x,.5,a.z,0x9cfff4);return true}

function saveCheckpoint(level,wave,pendingUpgrade=false){checkpoint={version:1,level,wave,upgrades:level===levelIndex?{...upgrades}:freshUpgrades(),pendingUpgrade};try{localStorage.setItem(SAVE_KEY,JSON.stringify(checkpoint))}catch(error){}}
function clearCheckpoint(){checkpoint=null;try{localStorage.removeItem(SAVE_KEY)}catch(error){}}
function waveHealth(level){return Math.round(level.hp*(1+waveIndex*.16))}
function waveRows(level){return level.rows.map((row,i)=>{const left={...row.left},right={...row.right};if(waveIndex===1&&i%2===0)row={...row,left:right,right:left};else row={...row,left,right};for(const lane of ['left','right']){const spec=row[lane];if(spec.motion)spec.speed*=1+waveIndex*.14;else if(waveIndex===2&&levelIndex>0){spec.motion=.28;spec.speed=1.15+i*.2;spec.phase=i*.9}}return row})}
const gates=[],hazards=[],enemies=[],units=[],particles=[],shots=[],enemyShots=[],impactRings=[];
const routeDecor=new THREE.Group();scene.add(routeDecor);
const bossDecor=new THREE.Group();fort.add(bossDecor);
const boss={enabled:false,phase:1,openSide:-1,swap:8,cooldown:3,charge:0,lanes:[],warnings:[],panels:[],emitters:[],markers:[]};
function stageTheme(index=levelIndex){return LEVELS[index].theme}
let levelIndex=checkpoint?.level||0,waveIndex=checkpoint?.wave||0,waveTimer=0,rows=[],state='menu',time=0,health=0,maxHealth=1,aim=0,shotTimer=0,shake=0,volleyCount=0,audio=null,muted=false,animationTime=0,hintTimeout=0,musicTimer=0,musicStep=0;
const MOVE_LIMIT=3.65,heldMoveKeys=new Set();
let cannonVelocity=0,dragPointer=null,dragStartX=0,dragStartAim=0;
function clampAim(x){return Math.max(-MOVE_LIMIT,Math.min(MOVE_LIMIT,x))}
function resetCannonInput(){
 heldMoveKeys.clear();cannonVelocity=0;aim=cannon.position.x;
 const pointerId=dragPointer;dragPointer=null;
 if(pointerId!==null&&renderer.domElement.hasPointerCapture(pointerId))renderer.domElement.releasePointerCapture(pointerId);
}
// A damped spring eases into motion and braking, with a bounded travel speed.
// Small steps keep the same feel across refresh rates and long frames.
function updateCannonMovement(dt){
 if(state!=='playing'||dt<=0)return;
 const start=cannon.position.x,steps=Math.ceil(dt*120),step=dt/steps,omega=18,maxChange=8*2/omega;
 const direction=Number(heldMoveKeys.has('arrowright')||heldMoveKeys.has('d'))-Number(heldMoveKeys.has('arrowleft')||heldMoveKeys.has('a'));
 for(let i=0;i<steps;i++){
  aim=clampAim(aim+direction*6*step);
  const current=cannon.position.x,change=Math.max(-maxChange,Math.min(maxChange,current-aim)),target=current-change;
  const impulse=(cannonVelocity+omega*change)*step,decay=Math.exp(-omega*step);
  let next=target+(change+impulse)*decay;
  cannonVelocity=(cannonVelocity-omega*impulse)*decay;
  if((aim-current)*(next-aim)>0){next=aim;cannonVelocity=0}
  cannon.position.x=clampAim(next);
  if(cannon.position.x!==next)cannonVelocity=0;
  if(Math.abs(aim-cannon.position.x)<.0002&&Math.abs(cannonVelocity)<.004){cannon.position.x=aim;cannonVelocity=0}
 }
 const movement=cannon.position.x-start;cannonWheels.forEach(w=>w.rotation.x+=movement/.76);
}
const bannerLeft=box(.9,1.65,.12,M.teal,-4.7,7.6,1.25,fort);
const bannerRight=box(.9,1.65,.12,M.teal,4.7,7.6,1.25,fort);
const guideMaterial=new THREE.MeshBasicMaterial({color:0x15758b,transparent:true,opacity:.88,depthWrite:false});
const guideDots=Array.from({length:20},(_,i)=>{const dot=sphere(.095+(i%4===0?.028:0),guideMaterial.clone());dot.castShadow=false;dot.visible=false;return dot});
const reticle=torus(.64,.075,new THREE.MeshBasicMaterial({color:0xffe08b,transparent:true,opacity:.92,depthWrite:false}),0,.28,0);reticle.rotation.x=Math.PI/2;reticle.visible=false;
function gateLabel(spec){return spec.kind==='multiply'?'×'+spec.value:'+'+spec.value}
function buildGate(row,i,lane){const spec=row[lane],center=lane==='left'?-2.28:2.28,gate=new THREE.Group();gate.position.set(center,0,row.z);scene.add(gate);
 const premium=spec.kind==='multiply',m=premium?M.gold:M.teal;
 for(const x of [-1.72,1.72]){cyl(.14,.17,3.35,m,x,1.77,0,gate,10);sphere(.22,M.cream,x,3.47,0,gate)}
 const top=box(3.62,.24,.26,m,0,3.49,0,gate);
 const plaque=label(gateLabel(spec),'#ffffff',premium?'#896124':'#0d7f88');plaque.position.set(0,2.85,.06);gate.add(plaque);const rule=label(premium?'PER TROOP':'ONCE / SQUAD','#ffffff',premium?'#896124':'#0d7f88',512,100);rule.scale.set(1,.38,1);rule.position.set(0,2.05,.07);gate.add(rule);
 for(const x of [-1.7,1.7])cyl(.34,.42,.24,M.gold,x,.22,0,gate);
 const glow=box(3.42,.035,.6,new THREE.MeshBasicMaterial({color:premium?0xffe6a0:0x94fff7,transparent:true,opacity:.72,depthWrite:false}),0,.245,.17,gate);glow.visible=false;
 const portal=new THREE.Mesh(new THREE.PlaneGeometry(3.25,2.7),new THREE.MeshBasicMaterial({color:premium?0xffd274:0x55ffef,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));portal.position.set(0,1.72,.02);portal.visible=false;gate.add(portal);
 const focusMat=new THREE.MeshBasicMaterial({color:premium?0xffe189:0xa5fff6,transparent:true,opacity:.95,depthWrite:false});
 const focusParts=[box(.13,2.7,.16,focusMat,-1.55,1.75,.27,gate),box(.13,2.7,.16,focusMat,1.55,1.75,.27,gate),box(3.25,.12,.16,focusMat,0,3.38,.27,gate)];focusParts.forEach(part=>part.visible=false);
 gates.push({row:i,lane,z:row.z,baseX:center,x:center,spec,group:gate,top,plaque,glow,portal,focusParts})}
function buildHazard(spec){const g=new THREE.Group();g.position.set(spec.x,.22,spec.z);scene.add(g);const warning=new THREE.MeshBasicMaterial({color:0xff7466,transparent:true,opacity:.72,depthWrite:false});
 box(spec.width+.38,.035,1.22,warning,0,.025,0,g);
 if(spec.kind==='spikes'){box(spec.width+.3,.22,1.05,M.redDark,0,.1,0,g);for(let x=-spec.width/2+.18;x<spec.width/2;x+=.36)for(const z of [-.28,.24])cyl(0,.13,.48,M.red,x,.4,z,g,4)}
 else {box(spec.width+.35,.18,.7,M.redDark,0,.21,0,g);for(const z of [-.2,.2])box(spec.width+.4,.11,.13,M.red,0,.4,z,g);for(const x of [-spec.width/2,spec.width/2])sphere(.22,M.gold,x,.4,0,g)}
 const sign=label('DANGER','#ffffff','#a9433d');sign.scale.setScalar(.48);sign.position.set(0,1.44,0);g.add(sign);
 hazards.push({...spec,group:g,currentX:spec.x})}
function impact(x,y,z,color=0xffdf85){if(impactRings.length>=20)return;const mesh=new THREE.Mesh(new THREE.RingGeometry(.15,.25,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);impactRings.push({mesh,life:.4})}
function buildRoutes(){while(routeDecor.children.length)removeObject(routeDecor.children[0]);const branch=LEVELS[levelIndex].branch;if(!branch)return;
 const mid=(branch.entry+branch.exit)/2;
 const island=box(1.15,.22,Math.abs(branch.entry-branch.exit)-2,M.stoneDark,0,.32,mid,routeDecor);island.rotation.y=.08;
 for(const [side,route] of [[-1,branch.left],[1,branch.right]]){const color=route.damage===2?0x65f2de:0xffc37b,m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.55});
  for(let i=0;i<13;i++){const t=i/12,z=branch.entry+(branch.exit-branch.entry)*t,x=side*(1.85+Math.sin(t*Math.PI)*.75);const dash=box(.11,.025,.42,m,x,.275,z,routeDecor);dash.rotation.y=side*Math.cos(t*Math.PI)*.28;const path=box(1.75,.035,Math.abs(branch.entry-branch.exit)/12+.09,M.stoneDark,side*(2.4+Math.sin(t*Math.PI)*.45),.235,z,routeDecor);path.rotation.y=side*Math.cos(t*Math.PI)*.18}
  const sign=label(route.name+' ×'+route.damage,'#ffffff',route.damage===2?'#176d70':'#995628',512,128);sign.scale.set(.85,.66,1);sign.position.set(side*2.55,1.2,branch.entry-.6);routeDecor.add(sign);
  for(const z of [branch.entry-1,branch.exit+1])cyl(.09,.13,.42,M.gold,side*.68,.48,z,routeDecor,6);
 }
}
function followRoute(a){const b=LEVELS[levelIndex].branch;if(!b)return;
 if(!a.route&&a.z<=b.entry){const spec=a.x<0?b.left:b.right;a.route={startX:a.x,target:spec.x,damage:spec.damage};a.routeSpread=(Math.random()-.5)*.72}
 if(!a.route)return;
 const t=Math.max(0,Math.min(1,(b.entry-a.z)/(b.entry-b.exit))),smooth=t*t*(3-2*t);
 a.x=a.route.startX+(a.route.target+a.routeSpread-a.route.startX)*smooth+Math.sign(a.route.target)*Math.sin(t*Math.PI)*.45;a.g.position.x=a.x;
 if(t===1&&a.attack===1){a.attack=a.route.damage;a.rig.shield.material=a.attack===3?M.gold:M.teal;impact(a.x,.28,a.z,a.attack===3?0xffd282:0x65f2de)}
}
function buildBoss(){while(bossDecor.children.length)removeObject(bossDecor.children[0]);for(const w of boss.warnings)removeObject(w);Object.assign(boss,{enabled:!!LEVELS[levelIndex].boss,phase:1,openSide:-1,swap:8,cooldown:3,charge:0,lanes:[],warnings:[],panels:[],emitters:[],markers:[]});ui.encounter.classList.add('hidden');if(!boss.enabled)return;
 for(const x of [-2.55,2.55]){const panel=box(4.6,5.4,.12,new THREE.MeshBasicMaterial({color:0xff637b,transparent:true,opacity:.28,depthWrite:false}),x,3.6,2.15,bossDecor);boss.panels.push(panel);const open=label('OPEN','#ddfff7','#126652'),closed=label('SHIELD','#ffe6eb','#913c54');for(const sign of [open,closed]){sign.scale.set(.78,.72,1);sign.position.set(x,4.8,2.4);bossDecor.add(sign)}boss.markers.push({open,closed});const emitter=sphere(.4,new THREE.MeshStandardMaterial({color:0xff6d8f,emissive:0xff264b,emissiveIntensity:1.5}),x,7.3,1.8,bossDecor);boss.emitters.push(emitter)}
 // A tall gold crown distinguishes the boss from the ordinary castles.
 box(5.2,.55,1.8,M.gold,0,10.7,0,bossDecor);for(let i=-2;i<=2;i++)cyl(0,.47,i%2===0?1.7:1.2,M.gold,i*1.05,11.5,0,bossDecor,5);
 for(const x of [-3,-1,1,3]){const warning=box(1.35,.03,44,new THREE.MeshBasicMaterial({color:0xff3e66,transparent:true,opacity:.4,depthWrite:false}),x,.29,-14);warning.visible=false;boss.warnings.push(warning)}
}
function updateBoss(dt){if(!boss.enabled)return false;
 const phase=health/maxHealth<=.5?2:1;
 if(phase!==boss.phase){boss.phase=phase;boss.swap=Math.min(boss.swap,6);boss.cooldown=Math.min(boss.cooldown,1);shake=.24;impact(0,.3,END,0xff657f);beep(95,.5,'sawtooth',.065)}
 boss.swap-=dt;if(boss.swap<=0){boss.openSide*=-1;boss.swap=boss.phase===2?6:8;beep(530,.12,'triangle',.035)}
 boss.panels.forEach((panel,i)=>{const open=(i===0?-1:1)===boss.openSide;panel.material.color.setHex(open?0x61ffe2:0xff567d);panel.material.opacity=open?.12:.5+Math.sin(animationTime*5)*.06;boss.markers[i].open.visible=open;boss.markers[i].closed.visible=!open;boss.emitters[i].material.emissive.setHex(open?0x19dcb2:0xff264b)});
 if(boss.charge>0){boss.charge-=dt;for(const lane of boss.lanes){const w=boss.warnings[lane];w.visible=true;w.material.opacity=.3+Math.abs(Math.sin(animationTime*10))*.4}if(boss.charge<=0){for(const lane of boss.lanes){const x=[-3,-1,1,3][lane],mesh=sphere(.36,enemyShotMat,x,1.12,END);enemyShots.push({mesh,x,z:END,speed:boss.phase===2?14:11.5,width:.8});puff(x,2,END,0xff7e91,5)}boss.warnings.forEach(w=>w.visible=false);boss.cooldown=boss.phase===2?2.9:4.2;beep(145,.25,'sawtooth',.045)}}
 else {boss.cooldown-=dt;if(boss.cooldown<=0){boss.lanes=chooseBossLanes(boss.phase===2?2:1);boss.charge=1.45;beep(360,.2,'triangle',.04)}}
 const text=`${boss.phase===2?'ENRAGED · ':''}${boss.openSide<0?'LEFT':'RIGHT'} SIDE OPEN · ${Math.ceil(boss.swap)}s`;
 if(ui.encounter.textContent!==text)ui.encounter.textContent=text;ui.encounter.classList.remove('hidden');ui.encounter.classList.toggle('enraged',boss.phase===2);return boss.charge>0;
}
function strikeCastle(a){let damage=(a.attack||1)+upgrades.power;if(boss.enabled&&(a.x<0?-1:1)!==boss.openSide){damage=Math.max(1,Math.ceil(damage*.3));impact(a.x,.35,END,0xff617b);puff(a.x,1.7,END,0xff8197,4);}waveReport.damage+=Math.min(health,damage);health=Math.max(0,health-damage);fortressHit(a.x);impact(a.x,.29,END,damage>1?0xffd782:0x9cfff4);puff(a.x,1.7,END,0xffdf85,damage>1?7:4)}
// Limbs pivot at hips and shoulders; body, shield, and helmet follow the gait.
// Eight shared frames replace thousands of separate meshes in a large crew.
const crewFrames=[false,true].map(gold=>Array.from({length:4},(_,frame)=>{
 const c=document.createElement('canvas');c.width=128;c.height=192;const g=c.getContext('2d'),stride=[-9,0,9,0][frame];
 const round=(x,y,w,h,r,color)=>{g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill()};
 g.fillStyle='#163f3b26';g.beginPath();g.ellipse(64,178,36,8,0,0,Math.PI*2);g.fill();
 round(43,133+stride,17,38,6,'#173f48');round(70,133-stride,17,38,6,'#173f48');
 round(37,163+stride,25,12,5,'#18333b');round(68,163-stride,25,12,5,'#18333b');
 round(33,82,62,66,17,gold?'#c4993d':'#269b90');round(42,90,43,42,9,gold?'#e9c66c':'#56cabb');
 round(27,92,16,43,7,'#1d6867');round(86,92,16,43,7,'#1d6867');
 round(42,39,46,48,14,'#efbd89');round(36,28,58,32,17,'#e4e5ca');
 round(36,47,58,13,4,'#2d6670');round(56,45,17,29,3,'#d9dfc8');
 round(60,12,12,26,4,gold?'#d6a742':'#338d83');
 g.strokeStyle='#f5df96';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(99,123);g.lineTo(108,78);g.stroke();
 g.strokeStyle='#52696c';g.lineWidth=3;g.beginPath();g.moveTo(99,123);g.lineTo(108,78);g.stroke();
 g.fillStyle=gold?'#e8c55f':'#367c84';g.strokeStyle='#f5db94';g.lineWidth=5;g.beginPath();g.moveTo(25,108);g.lineTo(64,108);g.lineTo(64,140);g.quadraticCurveTo(45,161,25,140);g.closePath();g.fill();g.stroke();
 g.strokeStyle='#f8e9b8';g.lineWidth=4;g.beginPath();g.moveTo(44,117);g.lineTo(44,144);g.moveTo(33,128);g.lineTo(56,128);g.stroke();
 const texture=new THREE.CanvasTexture(c);texture.encoding=THREE.sRGBEncoding;
 return new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.08,depthWrite:false});
}));
function crewSprite(parent){const sprite=new THREE.Sprite(crewFrames[0][0]);sprite.position.y=.88;sprite.scale.set(.94,1.6,1);parent.add(sprite);return {sprite,shield:{material:M.teal}}}
function soldier(parent,enemy=false){if(!enemy)return crewSprite(parent);const torso=new THREE.Group();parent.add(torso);const body=M.redDark,trim=M.red,legs=[],arms=[];
 cyl(.32,.39,.72,body,0,.88,0,torso,10);box(.62,.12,.45,M.gold,0,.58,0,torso);
 sphere(.29,M.skin,0,1.42,0,torso);cyl(.33,.31,.22,trim,0,1.63,0,torso,10);box(.13,.2,.4,enemy?M.gold:M.teal,0,1.82,0,torso);box(.42,.08,.14,M.gold,0,1.58,-.26,torso);
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.18,.55,0);parent.add(leg);box(.18,.44,.2,trim,0,-.2,0,leg);box(.2,.13,.32,trim,0,-.43,-.055,leg);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(side*.4,1.1,0);torso.add(arm);box(.17,.4,.19,body,0,-.16,0,arm);sphere(.11,M.skin,0,-.37,0,arm);arms.push(arm)}
 const shield=box(.44,.52,.12,enemy?M.red:M.teal,-.08,-.22,-.17,arms[0]);box(.31,.055,.02,M.gold,0,0,-.07,shield);box(.055,.36,.02,M.gold,0,0,-.07,shield);
 box(.065,.65,.08,M.gold,0,-.03,-.12,arms[1]);const cape=box(.48,.55,.06,trim,0,.87,.27,torso);
 return {torso,legs,arms,shield,cape};
}
function poseSoldier(rig,t,running=true,cheer=false){if(rig.sprite){const frame=running||cheer?Math.floor(t*.7)%4:1;rig.sprite.material=crewFrames[rig.shield.material===M.gold?1:0][frame];return}const stride=Math.sin(t);rig.legs[0].rotation.x=running?stride*.72:0;rig.legs[1].rotation.x=running?-stride*.72:0;rig.arms[0].rotation.x=cheer?-2.5+stride*.22:running?-stride*.65:-.2;rig.arms[1].rotation.x=cheer?-2.7-stride*.22:running?stride*.65:-.35;rig.torso.rotation.z=running?stride*.055:Math.sin(t*.3)*.025;rig.torso.rotation.x=running?-.11:0;rig.cape.rotation.x=running?.12+Math.abs(stride)*.25:0}
function makeEnemy(x,z,ranged=false){const g=new THREE.Group();g.position.set(x,.20,z);g.rotation.y=Math.PI;scene.add(g);const rig=soldier(g,true);
 const data=g.userData;data.alive=true;data.homeX=x;data.targetX=x;data.thinkTimer=0;data.moving=false;data.rig=rig;data.seed=Math.random()*6.28;data.ranged=ranged;data.cooldown=2+Math.random()*1.4;data.charge=0;
 if(ranged){const marker=sphere(.18,new THREE.MeshBasicMaterial({color:0xff5d4e}),0,1.95,0,g);marker.castShadow=false;const length=START-z,warning=box(.9,.026,length,new THREE.MeshBasicMaterial({color:0xff354c,transparent:true,opacity:.55,depthWrite:false}),x,.255,z+length/2);warning.castShadow=false;warning.visible=false;data.warning=warning}
 enemies.push(g)}
function buildStageDecor(index){index=stageTheme(index);while(stageDecor.children.length)removeObject(stageDecor.children[0]);while(castleExtras.children.length)removeObject(castleExtras.children[0]);
 if(index===0){for(const x of [-6.8,6.8])for(const z of [-6,-20,-32]){cyl(.36,.5,.8,M.stoneDark,x,.4,z,stageDecor,8);sphere(.3,M.teal,x,.9,z,stageDecor)}for(const x of [-4.7,4.7])cyl(0,1.15,1.5,M.teal,x,10.15,0,castleExtras,8)}
 else if(index===1){for(const x of [-6.8,6.8])for(const z of [-5,-18,-31]){cyl(.16,.22,2.7,M.copper,x,1.25,z,stageDecor,8);box(.95,.7,.08,M.gold,x+(x<0?-.5:.5),2.4,z,stageDecor);sphere(.22,M.gold,x,2.72,z,stageDecor)}for(const x of [-4.7,4.7])cyl(0,1.55,2.5,M.copper,x,10.45,0,castleExtras,8);box(2.6,.28,2.4,M.copper,0,8.2,-.8,castleExtras)}
 else {const flame=new THREE.MeshBasicMaterial({color:0xff8256});for(const x of [-7.1,7.1])for(const z of [-4,-18,-31]){cyl(.35,.55,2.2,M.navy,x,.9,z,stageDecor,6);cyl(0,.55,.95,M.stoneDark,x,2.45,z,stageDecor,6);sphere(.27,flame,x,2.97,z,stageDecor)}for(const x of [-4.7,4.7])cyl(0,1.38,3.4,M.navy,x,10.85,0,castleExtras,8);box(3.8,3.8,2.3,M.stoneDark,-6.25,3.2,-1.2,castleExtras);box(3.8,3.8,2.3,M.stoneDark,6.25,3.2,-1.2,castleExtras);cyl(0,1.15,2,M.navy,0,8.5,-.9,castleExtras,8)}}
const enemyShotMat=new THREE.MeshBasicMaterial({color:0xff4e62});
// Forecast the same curved route troops actually follow, including inherited route spread.
function predictTroopX(a,seconds){
 const branch=LEVELS[levelIndex].branch,z=a.z-8.2*Math.max(0,seconds);if(!branch||z>branch.entry)return a.x;
 const route=a.route||{startX:a.x,target:(a.x<0?branch.left:branch.right).x};
 const t=Math.max(0,Math.min(1,(branch.entry-z)/(branch.entry-branch.exit))),smooth=t*t*(3-2*t);
 return route.startX+(route.target+(a.routeSpread||0)-route.startX)*smooth+Math.sign(route.target)*Math.sin(t*Math.PI)*.45;
}
function enemyMoveSpeed(e){return e.userData.ranged?1.15:levelIndex===0?.8:1.35+Math.min(.35,waveIndex*.15)}
function enemyTargetX(e,a){
 const distance=Math.max(0,a.z-e.position.z);
 const arrival=e.userData.ranged?1.25+Math.max(0,(distance-8.2*1.25)/(8.2+10.5)):distance/8.2;
 return predictTroopX(a,arrival);
}
// Reserve melee targets and firing lanes so nearby defenders cover different threats.
function chooseEnemyTarget(e,claimed=new Set()){
 const d=e.userData;let target=null,best=-Infinity;const candidates=[];
 for(const a of units){const distance=a.z-e.position.z;if(distance<0||distance>(d.ranged?32:13))continue;
  if(d.ranged&&distance<11)continue;
  if(!d.ranged&&claimed.has(a))continue;
  const x=enemyTargetX(e,a),travel=Math.abs(x-e.position.x);
  if(Math.abs(x-d.homeX)>(d.ranged?2.2:1.6))continue;
  if(!d.ranged&&travel>enemyMoveSpeed(e)*distance/8.2+.5)continue;
  if(d.ranged&&Math.max(0,travel-.5)>enemyMoveSpeed(e)*(distance-8.2*1.25)/8.2)continue;
  if(d.ranged&&enemies.some(other=>other!==e&&other.userData.alive&&other.userData.charge>0&&Math.abs(other.userData.lockedX-x)<.95))continue;
  candidates.push({a,x,distance,travel});
 }
 for(const candidate of candidates){const {a,x,distance,travel}=candidate;
  const damage=Math.max(a.attack||1,a.route?.damage||1)+upgrades.power;
  let score=damage*2.4-distance*.1-travel*1.8-(a.armor||0)*.5;
  if(d.ranged)for(const other of candidates)if(Math.abs(other.x-x)<.7)score+=1.5;
  if(a===d.target)score+=.7;
  if(score>best){best=score;target=a}
 }
 return target;
}
function updateEnemyTactics(dt){
 if(state!=='playing')return;
 const claimed=new Set();
 for(const e of enemies){const d=e.userData;d.moving=false;if(!d.alive||d.charge>0)continue;
  d.thinkTimer-=dt;
  if(d.thinkTimer<=0||d.target&&(!units.includes(d.target)||claimed.has(d.target)||d.target.z<e.position.z)){d.target=chooseEnemyTarget(e,claimed);d.thinkTimer=.22+Math.random()*.12}
  d.targetX=d.target?enemyTargetX(e,d.target):d.homeX;
  if(d.target&&!d.ranged)claimed.add(d.target);
  const speed=enemyMoveSpeed(e);
  const delta=Math.max(-speed*dt,Math.min(speed*dt,d.targetX-e.position.x));
  e.position.x=Math.max(-4.1,Math.min(4.1,e.position.x+delta));d.moving=Math.abs(delta)>.002;
  if(d.warning)d.warning.position.x=e.position.x;
 }
}
function chooseBossLanes(count){
 const lanes=[-3,-1,1,3].map((x,index)=>({index,score:units.reduce((sum,a)=>sum+(Math.abs(a.x-x)<1.1?(a.attack||1):0),0)}));
 lanes.sort((a,b)=>b.score-a.score||Math.abs([-3,-1,1,3][a.index]-cannon.position.x)-Math.abs([-3,-1,1,3][b.index]-cannon.position.x));
 return lanes.slice(0,count).map(l=>l.index);
}
function updateEnemyAttacks(dt,bossCharging=false){let charging=bossCharging;for(const e of enemies){const d=e.userData;if(!d.ranged)continue;if(!d.alive){d.warning.visible=false;continue}
 if(d.charge>0){charging=true;d.charge-=dt;d.warning.visible=true;d.warning.material.opacity=.34+Math.abs(Math.sin(animationTime*9))*.4;if(d.charge<=0){d.warning.visible=false;const mesh=sphere(.26,enemyShotMat,d.lockedX,1.12,e.position.z+.45);mesh.castShadow=false;enemyShots.push({mesh,x:d.lockedX,z:e.position.z+.45});d.cooldown=4.8+Math.random()*2;beep(220,.12,'sawtooth',.022)}}
 else{d.cooldown=Math.max(0,d.cooldown-dt);if(d.cooldown<=0){const target=d.target&&units.includes(d.target)?d.target:chooseEnemyTarget(e);const winding=enemies.filter(other=>other.userData.alive&&other.userData.charge>0);const freeLane=!winding.some(other=>Math.abs(other.userData.lockedX-e.position.x)<.95);if(target&&target.z-e.position.z>=11&&target.z-e.position.z<=32&&Math.abs(enemyTargetX(e,target)-e.position.x)<.5&&winding.length<2&&freeLane&&!bossCharging){d.lockedX=e.position.x;d.charge=1.25;d.warning.position.x=d.lockedX;d.warning.visible=true;charging=true;beep(340,.18,'triangle',.018)}}}}
 ui.threat.classList.toggle('hidden',!charging);
 for(let i=enemyShots.length-1;i>=0;i--){const shot=enemyShots[i],old=shot.z;shot.z+=dt*(shot.speed||10.5);shot.mesh.position.z=shot.z;shot.mesh.position.y=1.08+Math.sin(animationTime*12)*.12;let hit=false;
 for(let j=units.length-1;j>=0;j--){const a=units[j],oldUnitZ=a.z+dt*8.2;if(Math.abs(a.x-shot.x)<(shot.width||.56)&&old<=oldUnitZ+.5&&shot.z>=a.z-.5){puff(a.x,.95,a.z,0xff7280,6);if(!absorbHit(a)){waveReport.lost++;removeObject(a.g);units.splice(j,1);}beep(95,.13,'sawtooth',.034);hit=true;break}}
 if(hit||shot.z>START+1){removeObject(shot.mesh);enemyShots.splice(i,1)}}}

function removeObject(o){if(o.parent)o.parent.remove(o);o.traverse(child=>{if(child.geometry)child.geometry.dispose();if(child.userData.ownedMaterial&&child.material){child.material.map?.dispose();child.material.dispose()}})}
function clearScene(){for(const r of impactRings){removeObject(r.mesh);r.mesh.material.dispose()}impactRings.length=0;for(const a of units)removeObject(a.g);for(const s of shots){removeObject(s.p);removeObject(s.halo)}for(const s of enemyShots)removeObject(s.mesh);for(const p of particles)removeObject(p.mesh);for(const e of enemies){if(e.userData.warning)removeObject(e.userData.warning);removeObject(e)}for(const g of gates)removeObject(g.group);for(const h of hazards)removeObject(h.group);units.length=shots.length=enemyShots.length=particles.length=enemies.length=gates.length=hazards.length=0;ui.threat.classList.add('hidden')}
function buildLevel(index,preserveTime=false){resetCannonInput();clearScene();resetCastle();const level=LEVELS[index];rows=waveRows(level);time=level.time;waveReport={shots:0,grown:0,lost:0,damage:0};health=maxHealth=waveHealth(level);scene.background.setHex(level.sky);scene.fog.color.setHex(level.sky);scene.fog.density=level.fog;M.water.color.setHex(level.water);M.stone.color.setHex(level.stone);M.stoneDark.color.setHex(level.stoneDark);M.grass.color.setHex(level.ground);M.deepGrass.color.setHex(level.groundDark);M.edge.color.setHex(level.edge);sun.color.setHex(level.sun);sun.intensity=level.sunPower;fort.scale.set(level.fortScale,level.fortScale*.78,level.fortScale);if(premiumReady)placePremiumModels(index);bannerLeft.material=bannerRight.material=stageTheme(index)===2?M.red:stageTheme(index)===1?M.gold:M.teal;buildStageDecor(index);buildRoutes();buildBoss();recoil=0;flashTime=0;gun.position.set(0,0,0);cannon.rotation.x=0;muzzleFlash.visible=false;muzzle.intensity=0;musicTimer=0;musicStep=0;
 rows.forEach((row,i)=>{buildGate(row,i,'left');buildGate(row,i,'right')});level.hazards.forEach(buildHazard);level.enemies.forEach(([x,z,ranged])=>makeEnemy(x,z,!!ranged));if(levelIndex>0)for(let n=0;n<waveIndex;n++){makeEnemy(-3.65+n*.3,-31-n*2,waveIndex===2);makeEnemy(3.65-n*.3,-31-n*2,waveIndex===2)}
 ui.level.textContent=` ${String(index+1).padStart(2,'0')} · ${level.name.toUpperCase()}`;ui.wave.textContent=`WAVE ${waveIndex+1} / ${level.waves}`;ui.hpTotal.textContent=maxHealth;updateHud()}
function beep(freq=440,duration=.08,type='sine',gain=.065){if(muted)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),v=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.5),audio.currentTime+duration);v.gain.setValueAtTime(gain,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(v).connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch(e){}}
// Quiet procedural music gives each area its own motif without network assets.
const MUSIC=[
 {notes:[523,659,784,659,587,523,392,440],interval:.48,type:'sine',gain:.018,bass:196},
 {notes:[440,523,659,587,523,440,349,392],interval:.34,type:'triangle',gain:.014,bass:146.8},
 {notes:[220,261.6,293.7,246.9,220,196,174.6,196],interval:.42,type:'sawtooth',gain:.008,bass:98}
];
function tone(freq,duration,type,gain){if(muted||!audio||audio.state!=='running')return;try{const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);v.gain.setValueAtTime(.001,t);v.gain.exponentialRampToValueAtTime(gain,t+.025);v.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(v).connect(audio.destination);o.start(t);o.stop(t+duration+.02)}catch(e){}}
function updateMusic(dt){if(muted)return;musicTimer-=dt;if(musicTimer>0)return;const score=MUSIC[stageTheme()];musicTimer+=score.interval;const note=score.notes[musicStep%score.notes.length];tone(note,score.interval*.85,score.type,score.gain);if(musicStep%4===0)tone(score.bass,score.interval*1.8,'sine',.012);musicStep++}

const particleMats=new Map();function puff(x,y,z,color=0xffd879,count=8){if(particles.length>100)return;if(!particleMats.has(color))particleMats.set(color,new THREE.MeshBasicMaterial({color}));const particleMat=particleMats.get(color);for(let i=0;i<count;i++){const mesh=sphere(.06+Math.random()*.09,particleMat,x,y,z);mesh.castShadow=false;particles.push({mesh,vx:(Math.random()-.5)*4,vy:1+Math.random()*3,vz:(Math.random()-.5)*4,t:.45+Math.random()*.25})}}
function unit(x,z,spread=0,passed=0,source=null){if(units.length>=MAX)return;const g=new THREE.Group();g.position.set(Math.max(-4.25,Math.min(4.25,x+spread)),.2,z);scene.add(g);const rig=soldier(g);g.scale.setScalar(.45);const a={g,x:g.position.x,z,rig,passed,bob:Math.random()*6.28,age:0,squad:source?.squad||{additions:new Set()},armor:source?source.armor:upgrades.armor,attack:source?.attack||1,route:source?.route?{...source.route,startX:source.route.startX+spread}:null,routeSpread:source?.routeSpread||0};if(a.attack>1)rig.shield.material=a.attack===3?M.gold:M.teal;units.push(a)}
const shotHaloMat=new THREE.MeshBasicMaterial({color:0x9afaff,transparent:true,opacity:.2});
function fire(){waveReport.shots++;shotTimer=LEVELS[levelIndex].fire/(1+.25*upgrades.rapid);volleyCount++;const x=cannon.position.x;const p=sphere(.27,M.teal,x,1.22,9.4);const halo=sphere(.38,shotHaloMat,x,1.22,9.4);shots.push({p,halo,x,z:9.4,t:0});muzzle.intensity=6;recoil=1;flashTime=.11;muzzleFlash.visible=true;puff(x,1.3,9.5,0xd5eee6,3);shake=Math.max(shake,.055);if(volleyCount%2===0)beep(190,.11,'triangle',.035)}
function startLevel(){const pending=checkpoint?.pendingUpgrade===true&&checkpoint.level===levelIndex&&checkpoint.wave===waveIndex&&waveIndex>0;if(pending){buildLevel(levelIndex);waveIndex--;showUpgradeChoice();return}saveCheckpoint(levelIndex,waveIndex);buildLevel(levelIndex);if(audio?.state==='suspended')audio.resume().catch(()=>{});shotTimer=.65;aim=2.28;cannon.position.x=2.28;volleyCount=0;state='playing';setPlayUi(true);ui.pause.innerHTML='Ⅱ <span>PAUSE</span>';ui.pause.setAttribute('aria-label','Pause game');ui.restart.classList.add('hidden');ui.overlay.classList.add('hidden');ui.hud.classList.remove('hidden');ui.aim.classList.remove('hidden');ui.hint.textContent=levelIndex===0?'Your cannon fires automatically. Try a route button, drag the cannon, or hold ← →.':LEVELS[levelIndex].hint;ui.hint.classList.remove('hidden');clearTimeout(hintTimeout);hintTimeout=setTimeout(()=>ui.hint.classList.add('hidden'),5000);beep(640,.2)}
function hideAttackWarnings(){ui.threat.classList.add('hidden');boss.warnings.forEach(w=>w.visible=false);for(const e of enemies)if(e.userData.warning)e.userData.warning.visible=false}
function queueWave(){resetCannonInput();setPlayUi(false);state='wavebreak';waveTimer=2.4;castleCollapse();hideAttackWarnings();ui.aim.classList.add('hidden');guideDots.forEach(dot=>dot.visible=false);reticle.visible=false;saveCheckpoint(levelIndex,waveIndex+1,true);clearTimeout(hintTimeout);ui.hint.textContent='WALL BREACHED · DEFENDERS ARE REGROUPING';ui.hint.classList.remove('hidden')}
function nextWave(){waveIndex++;buildLevel(levelIndex);setPlayUi(true);saveCheckpoint(levelIndex,waveIndex);shotTimer=.4;state='playing';ui.hud.classList.remove('hidden');ui.aim.classList.remove('hidden');ui.hint.textContent=`WAVE ${waveIndex+1} · NEW DEFENDERS · CHECK THE GATES`;clearTimeout(hintTimeout);hintTimeout=setTimeout(()=>ui.hint.classList.add('hidden'),4000);beep(720,.2)}
function pauseGame(){if(state!=='playing')return;resetCannonInput();setPlayUi(false);state='paused';hideAttackWarnings();ui.encounter.classList.add('hidden');ui.overlay.classList.remove('hidden');ui.hud.classList.add('hidden');ui.aim.classList.add('hidden');ui.hint.classList.add('hidden');$('#title').classList.add('result');$('#title').innerHTML='SIEGE <span class="accent">PAUSED</span>';$('#subtitle').textContent=`${LEVELS[levelIndex].name} · wave ${waveIndex+1} of ${LEVELS[levelIndex].waves}. Your checkpoint is saved.`;$('#stage-eyebrow').textContent=`STAGE ${levelIndex+1} OF ${LEVELS.length}`;$('#play').textContent='RESUME SIEGE';ui.restart.classList.add('hidden');if(audio?.state==='running')audio.suspend().catch(()=>{})}
function resumeGame(){state='playing';setPlayUi(true);ui.overlay.classList.add('hidden');ui.hud.classList.remove('hidden');ui.aim.classList.remove('hidden');if(audio?.state==='suspended')audio.resume().catch(()=>{})}
function activatePlay(){if(state==='playing'||state==='wavebreak'||state==='upgrading')return;if(state==='paused'){resumeGame();return}if(state==='between'){levelIndex++;waveIndex=0;upgrades=freshUpgrades()}else if(state==='complete'){levelIndex=0;waveIndex=0;upgrades=freshUpgrades()}startLevel()}
function showSavedCampaign(){if(!checkpoint||(checkpoint.level===0&&checkpoint.wave===0))return;$('#play').textContent='CONTINUE CAMPAIGN';$('#subtitle').textContent=`Saved at ${LEVELS[checkpoint.level].name}, wave ${checkpoint.wave+1} of 3. Continue your march through ${LEVELS.length} fortresses.`;ui.restart.classList.remove('hidden')}
function finish(win){resetCannonInput();if(win&&waveIndex<LEVELS[levelIndex].waves-1){queueWave();return}if(win){if(levelIndex<LEVELS.length-1)saveCheckpoint(levelIndex+1,0);else clearCheckpoint()}setPlayUi(false);state=win?(levelIndex===LEVELS.length-1?'complete':'between'):'lose';if(win)castleCollapse();ui.threat.classList.add('hidden');ui.encounter.classList.add('hidden');boss.warnings.forEach(w=>w.visible=false);for(const e of enemies)if(e.userData.warning)e.userData.warning.visible=false;ui.overlay.classList.remove('hidden');ui.hud.classList.add('hidden');ui.aim.classList.add('hidden');ui.hint.classList.add('hidden');guideDots.forEach(dot=>dot.visible=false);reticle.visible=false;
 const title=$('#title'),sub=$('#subtitle'),button=$('#play'),eyebrow=$('#stage-eyebrow');title.classList.add('result');
 if(state==='between'){title.innerHTML='Fortress<br><span class="accent">conquered.</span>';sub.textContent=`${LEVELS[levelIndex].name} is yours. Three waves cleared. ${LEVELS.length-levelIndex-1} fortresses stand between you and the crown.`;button.textContent='NEXT FORTRESS ↗';eyebrow.textContent=`LEVEL ${levelIndex+1} COMPLETE`}
 else if(state==='complete'){title.innerHTML='The crown<br><span class="accent">is yours.</span>';sub.textContent=`You conquered all ${LEVELS.length} fortresses and broke the Iron Crown. The kingdom is yours.`;button.textContent='PLAY AGAIN';eyebrow.textContent='ALL LEVELS COMPLETE'}
 else {title.innerHTML='Regroup.<br><span class="accent">Try a new route.</span>';sub.textContent=`You dealt ${waveReport.damage} damage and recruited ${waveReport.grown} troops. Try the other route or time a moving gate. Your upgrades are kept.`;button.textContent='RETRY WAVE ↗';eyebrow.textContent=`LEVEL ${levelIndex+1} · ${LEVELS[levelIndex].name.toUpperCase()}`}
 beep(win?750:180,.4,win?'sine':'sawtooth',.08)}
function updateHud(){updateUpgradeHud();ui.army.textContent=units.length;ui.hp.textContent=Math.max(0,health);ui.timer.textContent=Math.ceil(time);ui.progress.style.width=`${health/maxHealth*100}%`;ui.progress.parentElement.setAttribute('aria-valuenow',String(Math.round(health/maxHealth*100)));ui.progress.style.background=health/maxHealth<.25?'#c79047':'';$('#wave-stats').textContent=waveReport.shots+' shots launched · '+waveReport.grown+' recruited\n'+waveReport.damage+' damage · '+waveReport.lost+' troops lost'}
function gateXAt(g,t){return g.spec.motion?g.baseX+Math.sin(t*g.spec.speed+(g.spec.phase||0))*g.spec.motion:g.baseX}
// Preview a fresh squad, applying each gate in travel order (not expression precedence).
function previewGateChain(x){
 const branch=LEVELS[levelIndex].branch,route=branch?(x<0?branch.left:branch.right):null;
 let count=1;const steps=[],path=[];
 for(let i=0;i<rows.length;i++){
  const row=rows[i];let px=x;
  if(route&&row.z<=branch.entry){const t=Math.max(0,Math.min(1,(branch.entry-row.z)/(branch.entry-branch.exit)));px=x+(route.x-x)*t*t*(3-2*t)+Math.sign(route.x)*Math.sin(t*Math.PI)*.45}
  const at=animationTime+.26+(START-row.z)/8.2;
  const gate=gates.filter(g=>g.row===i&&Math.abs(px-gateXAt(g,at))<1.7).sort((a,b)=>Math.abs(px-gateXAt(a,at))-Math.abs(px-gateXAt(b,at)))[0];
  if(gate){count=gateResult(count,gate.spec);steps.push(gateLabel(gate.spec)+' = '+count);path.push(gate)}else steps.push('MISS = '+count);
 }
 return {count,steps,path,route};
}
function updateAimGuide(){if(state!=='playing')return;
 const first=rows[0],x=cannon.position.x,preview=previewGateChain(x);
 guideDots.forEach((dot,i)=>{dot.visible=true;dot.position.set(x,.3,9.35+(first.z-9.35)*(i+1)/21);dot.material.opacity=.45+.4*(1-i/20)});
 reticle.visible=true;reticle.position.set(x,.3,first.z+.8);reticle.rotation.z+=.012;
 for(const gate of gates){const onPath=preview.path.includes(gate);gate.glow.visible=onPath;gate.portal.visible=onPath;gate.focusParts.forEach(part=>part.visible=onPath);gate.group.scale.setScalar(onPath?1.055:1)}
 const selected=preview.path.find(g=>g.row===0);ui.aim.textContent=selected?'Aiming '+gateLabel(selected.spec)+' · '+preview.count+' troops before losses':'Between gates · choose a route';
 for(const side of ['left','right']){const p=previewGateChain(side==='left'?-2.28:2.28);const symbols=p.steps.map(step=>step.startsWith('MISS')?'—':step.split(' = ')[0]);$('#'+side+'-maths').textContent=symbols.join(' → ');$('#'+side+'-total').textContent=p.count+' troops';$('#route-'+side).classList.toggle('active',!!selected&&selected.lane===side)}
}

function resize(){const field=$('#battlefield'),width=field.clientWidth,height=Math.max(1,field.clientHeight),aspect=width/height;const half=12;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half+2.8;camera.bottom=-half+2.8;camera.updateProjectionMatrix();renderer.setSize(width,height)}
window.addEventListener('resize',resize);resize();
const aimRay=new THREE.Raycaster(),aimPointer=new THREE.Vector2();
function pointerWorldX(e){const rect=renderer.domElement.getBoundingClientRect();aimPointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);aimRay.setFromCamera(aimPointer,camera);const ray=aimRay.ray;return (ray.origin.x-ray.origin.y*ray.direction.x/ray.direction.y)/scene.scale.x}
function pointer(e){
 if(state!=='playing'||dragPointer!==e.pointerId)return;
 aim=clampAim(dragStartAim+pointerWorldX(e)-dragStartX);
}
renderer.domElement.addEventListener('pointerdown',e=>{
 if(state!=='playing'||dragPointer!==null||!e.isPrimary||e.button!==0)return;
 heldMoveKeys.clear();dragPointer=e.pointerId;dragStartX=pointerWorldX(e);dragStartAim=aim;
 renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',pointer);
renderer.domElement.addEventListener('pointerup',e=>{
 if(dragPointer!==e.pointerId)return;if(Math.abs(pointerWorldX(e)-dragStartX)<.16)aim=clampAim(pointerWorldX(e));dragPointer=null;
 if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointercancel',e=>{if(dragPointer===e.pointerId)resetCannonInput()});
renderer.domElement.addEventListener('lostpointercapture',e=>{if(dragPointer===e.pointerId)resetCannonInput()});
window.addEventListener('blur',resetCannonInput);
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase(),steer=['arrowleft','arrowright','a','d'].includes(key);
 if(steer||[' ','escape'].includes(key))e.preventDefault();
 if(e.repeat)return;
 if(key==='escape'||key==='p'){if(state==='playing')pauseGame();else if(state==='paused')resumeGame();return}
 if(state==='playing'&&steer){
  const pointerId=dragPointer;dragPointer=null;
  if(pointerId!==null&&renderer.domElement.hasPointerCapture(pointerId))renderer.domElement.releasePointerCapture(pointerId);
  heldMoveKeys.add(key);
 }else if((key===' '||key==='enter')&&e.target?.tagName!=='BUTTON')activatePlay();
});
window.addEventListener('keyup',e=>heldMoveKeys.delete(e.key.toLowerCase()));
$('#route-left').addEventListener('click',()=>chooseRoute(-1));$('#route-right').addEventListener('click',()=>chooseRoute(1));$('#home').addEventListener('click',e=>{e.preventDefault();if(state==='playing')pauseGame()});
$('#play').addEventListener('click',activatePlay);ui.pause.addEventListener('click',pauseGame);ui.restart.addEventListener('click',()=>{clearCheckpoint();levelIndex=0;waveIndex=0;upgrades=freshUpgrades();startLevel()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pauseGame()});ui.sound.addEventListener('click',()=>{muted=!muted;ui.sound.textContent=muted?'SOUND OFF':'SOUND ON';ui.sound.setAttribute('aria-pressed',String(muted));ui.sound.setAttribute('aria-label',muted?'Unmute sound':'Mute sound')});
function stepGame(dt){if(state!=='paused')animationTime+=dt;gem.rotation.y+=dt*.9;gem.position.y=Math.sin(animationTime*2)*.17;
 recoil=Math.max(0,recoil-dt*6.5);gun.position.z=recoil*.58;gun.position.y=recoil*.08;cannon.rotation.x=-recoil*.045;flashTime=Math.max(0,flashTime-dt);muzzleFlash.visible=flashTime>0;muzzleFlash.scale.set(1+recoil,.65,1.6+recoil);muzzle.intensity=Math.max(0,muzzle.intensity-dt*50);
 for(const e of enemies)if(e.userData.alive){poseSoldier(e.userData.rig,animationTime*(e.userData.moving?10:3)+e.userData.seed,state==='playing'&&e.userData.moving);e.position.y=.2+Math.sin(animationTime*2+e.userData.seed)*.025;if(e.userData.charge>0)e.userData.rig.arms[1].rotation.x=-1.1}
 if(state==='between'||state==='complete')for(const a of units)poseSoldier(a.rig,animationTime*10+a.bob,false,true);
 for(const gate of gates){gate.x=gateXAt(gate,animationTime);gate.group.position.x=gate.x;gate.top.position.y=3.49+Math.sin(animationTime*2+gate.z)*.055}
 for(const flag of premiumFort.children)if(flag.userData.flag)flag.rotation.z=flag.userData.baseRotation+Math.sin(animationTime*2+flag.position.x)*.08;
 for(const hazard of hazards){hazard.currentX=hazard.x+Math.sin(animationTime*(hazard.speed||0)+.6)*(hazard.motion||0);hazard.group.position.x=hazard.currentX}
 if(state==='wavebreak'){waveTimer-=dt;ui.encounter.textContent=`WAVE ${waveIndex+1} CLEARED · NEXT WAVE IN ${Math.max(1,Math.ceil(waveTimer))}`;ui.encounter.classList.remove('hidden');if(waveTimer<=0)showUpgradeChoice()}
 if(state==='playing'){
  time=Math.max(0,time-dt);shotTimer-=dt;updateCannonMovement(dt);if(shotTimer<=0)fire();updateEnemyTactics(dt);updateAimGuide();const bossCharging=updateBoss(dt);
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.t+=dt;s.z-=dt*11;s.p.position.z=s.halo.position.z=s.z;s.p.position.y=s.halo.position.y=1.2+Math.sin(Math.min(1,s.t/.24)*Math.PI)*.75;if(s.t>.26){unit(s.x,START);removeObject(s.p);removeObject(s.halo);shots.splice(i,1)}}
  for(let i=units.length-1;i>=0;i--){const a=units[i],old=a.z;a.z-=dt*8.2;a.g.position.z=a.z;a.bob+=dt*16;a.age+=dt;a.g.scale.setScalar(.8*Math.min(1,.6+a.age*2));a.g.position.y=.19+Math.abs(Math.sin(a.bob))*.085;followRoute(a);poseSoldier(a.rig,a.bob);
   for(let j=0;j<rows.length;j++){const row=rows[j];if(!(a.passed&(1<<j))&&old>row.z&&a.z<=row.z){a.passed|=1<<j;const gate=gates.filter(g=>g.row===j&&Math.abs(a.x-g.x)<1.7).sort((l,r)=>Math.abs(a.x-l.x)-Math.abs(a.x-r.x))[0];if(gate){const count=gateGrowth(a,gate),added=Math.min(count,MAX-units.length);for(let k=0;k<added;k++)unit(a.x,a.z+.2+(k%2)*.3,(Math.random()-.5)*1.15,a.passed,a);waveReport.grown+=added;if(added>0&&animationTime-(gate.lastFx||-1)>.14){gate.lastFx=animationTime;puff(a.x,1.6,row.z,0x90fff7,5);beep(500+90*j,.1,'sine',.018)}}}}
   let hit=false;
   for(const h of hazards){if(old>h.z&&a.z<=h.z&&Math.abs(a.x-h.currentX)<h.width/2){hit=true;puff(a.x,.55,h.z,0xff756d,3);beep(120,.07,'sawtooth',.014);break}}
   if(!hit)for(const e of enemies){if(!e.userData.alive)continue;if(Math.abs(a.z-e.position.z)<.55&&Math.abs(a.x-e.position.x)<.54){e.userData.alive=false;e.visible=false;if(e.userData.warning)e.userData.warning.visible=false;puff(e.position.x,.8,e.position.z,0xff9684,6);impact(e.position.x,.28,e.position.z,0xffac7e);hit=true;beep(140,.1,'sawtooth',.02);break}}
   if(hit&&absorbHit(a))hit=false;
   if(hit||a.z<END){if(hit)waveReport.lost++;if(!hit)strikeCastle(a);removeObject(a.g);units.splice(i,1);if(health<=0){health=0;finish(true);break}}}
  if(state==='playing'){updateEnemyAttacks(dt,bossCharging);updateMusic(dt)}if(time<=0&&state==='playing')finish(false);updateHud()}
 fortFlash=Math.max(0,fortFlash-dt*1.6);wallFlash.material.opacity=fortFlash*.55;gem.material.emissiveIntensity=1.2+fortFlash*3;
 for(let i=impactRings.length-1;i>=0;i--){const r=impactRings[i];r.life-=dt;r.mesh.scale.setScalar(1+(.4-r.life)*6);r.mesh.material.opacity=Math.max(0,r.life*2);if(r.life<=0){removeObject(r.mesh);r.mesh.material.dispose();impactRings.splice(i,1)}}
 for(let i=rubble.length-1;i>=0;i--){const r=rubble[i];r.life-=dt;r.piece.position.x+=r.vx*dt;r.piece.position.y+=r.vy*dt;r.piece.position.z+=r.vz*dt;r.vy-=dt*10;r.piece.rotation.x+=dt*5;r.piece.rotation.z+=dt*3;if(r.life<=0||r.piece.position.y<.1){removeObject(r.piece);rubble.splice(i,1)}}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.t-=dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;p.vy-=dt*9;p.mesh.scale.setScalar(Math.max(.05,p.t*1.6));if(p.t<=0){removeObject(p.mesh);particles.splice(i,1)}}
 if(shake>0){shake=Math.max(0,shake-dt);camera.position.x=(Math.random()-.5)*shake*1.7}else camera.position.x+=(0-camera.position.x)*Math.min(1,dt*12);
 }
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-previous)/1000);previous=now;stepGame(dt);renderer.render(scene,camera)}
let previous=performance.now();buildLevel(levelIndex);showSavedCampaign();loadPremiumModels();requestAnimationFrame(animate);
 } catch(error){document.querySelector('#load-error').classList.remove('hidden');console.error(error)}
})();
