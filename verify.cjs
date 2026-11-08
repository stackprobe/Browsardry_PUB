'use strict';
// Verify the current shipped data and behavior without historical snapshots.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const W=require('./DocRoot/engine.js');
let checks=0;
function test(name,fn){fn();console.log('PASS '+name);checks++;}
function memoryStorage(seed={}){const data=new Map(Object.entries(seed));return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
function location(g,f,symbol='E'){
 Object.assign(g.s,{town:W.floors[f].town,floor:f,scene:'dungeon',facility:null,enemy:null});
 [g.s.x,g.s.y]=W.findTile(f,symbol);g.reveal();return g;
}
function reachable(f,start){
 const found=new Map([[start.join(','),[]]]),queue=[start];
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i],route=found.get(x+','+y);
  for(let d=0;d<4;d++){const nx=x+W.dx[d],ny=y+W.dy[d],key=nx+','+ny;if(W.tile(f,nx,ny)==='#'||found.has(key))continue;found.set(key,[...route,d]);queue.push([nx,ny]);}
 }
 return found;
}
function walk(g,to){
 const route=reachable(g.s.floor,[g.s.x,g.s.y]).get(to.join(','));assert.ok(route,'destination must be reachable');
 for(const d of route){g.s.direction=d;assert.equal(g.move(),true);}
}

// Minimal DOM/Canvas adapter for running the shipped browser scripts in Node.
function ui(initialState=null,{images=true,random=()=>.99,reducedMotion=false,storage=memoryStorage(),pageLocation={protocol:'http:',hostname:'example.com'}}={}){
 if(initialState)storage.setItem('browsardry_save',W.encode(initialState));
 let cookie='';const allowCookies=true,autoFinishPlaces=true;
 const elements=new Map(),listeners={},winListeners={},drawCalls=[],rects=[],strokes=[],fills=[],gradients=[],loadedImages=[],stack=[],mapRects=[],mapTexts=[],texts=[];let frame,now=0;
 const context=new Proxy({globalAlpha:1}, {get:(o,k)=>k in o?o[k]:k==='save'?()=>stack.push({...o}):k==='restore'?()=>Object.assign(o,stack.pop()):k==='createLinearGradient'||k==='createRadialGradient'?(...args)=>{const g={kind:k,args,stops:[],addColorStop(at,color){this.stops.push([at,color]);}};gradients.push(g);return g;}:k==='drawImage'?(...args)=>{args.alpha=o.globalAlpha;drawCalls.push(args);}:k==='fillText'?(...args)=>{args.color=o.fillStyle;args.alpha=o.globalAlpha;texts.push(args);}:k==='fill'?()=>fills.push({color:o.fillStyle,alpha:o.globalAlpha}):k==='stroke'?()=>strokes.push(o.strokeStyle):k==='fillRect'?(...args)=>rects.push({args,color:o.fillStyle,alpha:o.globalAlpha}):()=>{},set:(o,k,v)=>(o[k]=v,true)});
 function make(tag){return {get onclick(){return this._onclick;},set onclick(fn){this._onclick=(...args)=>{fn(...args);if(autoFinishPlaces&&el('app').dataset.transition==='place'){now+=560;frame(now);}};},hidden:false,open:false,isConnected:true,children:[],style:{},dataset:{},get textContent(){return tag!=='button'&&this.children.length?this.children.map(child=>child.textContent).join(''):(this._textContent||'');},set textContent(value){this._textContent=String(value);this.children=[];},className:'',scrollIntoView(){},getContext:()=>context,setAttribute(k,v){this[k]=v;},append(...n){this.children.push(...n);},replaceChildren(...n){this.children=n;},querySelector(){return this.children[0]||(this.children[0]=make());},addEventListener(k,fn){this['on'+k]=fn;},focus(){doc.activeElement=this;},showModal(){this.open=true;},close(){this.open=false;this.onclose?.();},get offsetWidth(){return 720;}};}
 const el=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id);};
 el('map').getContext=()=>new Proxy(context,{get:(o,k)=>k==='fillRect'?(...args)=>mapRects.push(args):k==='fillText'?(...args)=>mapTexts.push(args):o[k]});
 const moves=[...fs.readFileSync(__dirname+'/DocRoot/index.html','utf8').matchAll(/data-move="([^"]+)"/g)].map(([,m])=>{const b=make();b.dataset.move=m;return b;});
 const doc={getElementById:el,createElement:make,querySelectorAll:()=>moves,addEventListener:(k,f)=>listeners[k]=f,hidden:false,activeElement:null};
 Object.defineProperty(doc,'cookie',{get:()=>cookie,set:v=>{if(allowCookies)cookie=v.split(';')[0];}});
 const math=Object.create(Math);math.random=random;
 const sandbox={Math:math,performance:{now:()=>now},document:doc,window:{localStorage:storage,addEventListener:(k,f)=>winListeners[k]=f,matchMedia:()=>({matches:reducedMotion})},location:pageLocation,Image:class{removeAttribute(name){if(name==='src')this.released=true;}set src(v){this.value=v;loadedImages.push(this);if(!images){this.onerror();return;}const file=fs.readFileSync(__dirname+'/DocRoot/'+v);assert.equal(file.toString('ascii',1,4),'PNG');this.naturalWidth=file.readUInt32BE(16);this.naturalHeight=file.readUInt32BE(20);}},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:f=>frame=f,console};
 const scripts=[...fs.readFileSync(__dirname+'/DocRoot/index.html','utf8').matchAll(/<script defer src="([^"]+)"/g)].map(([,src])=>fs.readFileSync(__dirname+'/DocRoot/'+src,'utf8'));
 vm.runInNewContext(scripts.join('\n'),sandbox);
 const state=()=>W.decode(storage?.getItem('browsardry_save')||decodeURIComponent(cookie.slice(cookie.indexOf('=')+1)));
 return {enter(){el('commands').children[4].onclick();},el,moves,listeners,winListeners,state,mapRects,mapTexts,texts,rects,strokes,fills,gradients,doc,loadedImages,drawCalls,cookie:()=>cookie,clickCommand(i){el('commands').children[i].onclick();},frame(ms=150){now+=ms;frame(now);},move(name){moves.find(b=>b.dataset.move===name).onclick();},key(key){listeners.keydown({key,preventDefault(){}});listeners.keyup?.({key});if(autoFinishPlaces&&el('app').dataset.transition==='place'){now+=560;frame(now);}},button(text){const b=el('dialog-buttons').children.find(x=>x.textContent===text);assert.ok(b,text);b.onclick();}};
}

test('Scenery stays black until the selected PNG loads',()=>{
 const u=ui();
 const assertBlack=(view,width,height)=>{
  assert.deepEqual(view.rects.at(-1),{args:[0,0,width,height],color:'#000',alpha:1});
  assert.equal(view.drawCalls.length,0);
  assert.equal(view.gradients.length,0);
 };
 const image=path=>u.loadedImages.find(img=>img.value===path);
 const title=image('./assets/scenery/title.png');
 assertBlack(u,960,580);
 assert.equal(u.el('title-screen').dataset.sceneryReady,'false');
 title.onload();
 assert.equal(u.drawCalls.at(-1)[0],title);
 assert.equal(u.el('title-screen').dataset.sceneryReady,'true');

 u.drawCalls.length=0;
 u.el('start').onclick();
 assertBlack(u,720,400);
 const town=image(W.towns[0].image),tavern=image(W.towns[0].facilities.tavern.image);
 town.onload();
 assert.equal(u.drawCalls.at(-1)[0],town);
 u.clickCommand(0);
 u.drawCalls.length=0;
 u.frame();
 assertBlack(u,720,400);
 tavern.onload();
 assert.equal(u.drawCalls.at(-1)[0],tavern);

 const failed=ui(null,{images:false});
 assertBlack(failed,960,580);
 failed.el('start').onclick();
 assertBlack(failed,720,400);
});

test('Current maps, stairs and events are valid and reachable',()=>{
 for(const town of W.towns){
  const list=W.townFloors[town.id];assert.ok(list.length);
  list.forEach((f,i)=>{
   const m=W.floors[f],rows=m.rows,flat=rows.join(''),width=rows[0].length;
   assert.equal(m.level,i+1);assert.equal(rows.length,m.generation.height);assert.equal(width,m.generation.width);
   assert.ok(rows.every(r=>r.length===width&&/^[#.E<>COB]+$/.test(r)&&r[0]==='#'&&r.at(-1)==='#'));
   assert.ok(/^#+$/.test(rows[0])&&/^#+$/.test(rows.at(-1)));
   for(const [c,n] of [['E',i?0:1],['<',i?1:0],['>',i<list.length-1?1:0],['B',i===list.length-1?1:0],['O',1],['C',m.generation.chests]])assert.equal(flat.split(c).length-1,n);
   assert.equal(reachable(f,W.findTile(f,i?'<':'E')).size,[...flat].filter(c=>c!=='#').length);
  });
 }
});

test('Three local enemies per floor become progressively stronger',()=>{
 const used=new Set();
 for(const town of W.towns){
  const floors=W.townFloors[town.id].map(f=>W.floors[f]),roster=[];
  floors.forEach((m,i)=>{
   assert.equal(m.encounterEnemies.length,3);assert.equal(new Set(m.encounterEnemies).size,3);
   if(i){assert.deepEqual(m.encounterEnemies.slice(0,2),floors[i-1].encounterEnemies.slice(1));assert.ok(!roster.includes(m.encounterEnemies[2]));roster.push(m.encounterEnemies[2]);}else roster.push(...m.encounterEnemies);
   for(const [slot,id] of m.encounterEnemies.entries()){
    const e=W.enemyById[id];assert.equal(e.town,town.id);assert.equal(e.boss,false);used.add(id);
    const g=location(new W.Adventure(()=>(slot+.5)/3),W.floors.indexOf(m),i?'<':'E');g.battle(false);assert.equal(g.s.enemy.kind,id);
   }
  });
  for(let i=1;i<roster.length;i++)for(const k of ['health','attack','experience','gold'])assert.ok(W.enemyById[roster[i]][k]>W.enemyById[roster[i-1]][k]);
  const boss=W.enemyById[floors.at(-1).bossEnemy];assert.equal(boss.boss,true);used.add(boss.id);
  for(const id of floors.at(-1).encounterEnemies){assert.ok(boss.health>W.health[id]);assert.ok(boss.attack>W.enemyById[id].attack);}
 }
 assert.equal(used.size,W.enemies.length);
});

test('Current saves preserve every floor and enemy and reject corrupt records',()=>{
 for(const enemy of W.enemies){
  const f=W.floors.findIndex(m=>m.encounterEnemies.includes(enemy.id)||m.bossEnemy===enemy.id),g=location(new W.Adventure(),f,enemy.boss?'B':W.floors[f].level===1?'E':'<');
  Object.assign(g.s,{scene:'battle',enemy:{kind:enemy.id,hp:enemy.health,boss:enemy.boss},gold:1234,weapon:3,armor:2,ores:[W.floors[f].oreId],oreBag:[W.floors[f].oreId]});
  assert.equal(W.encode(W.decode(W.encode(g.s))),W.encode(g.s));
 }
 for(const m of W.floors){const g=location(new W.Adventure(),W.floors.indexOf(m),m.level===1?'E':'<');assert.equal(W.encode(W.decode(W.encode(g.s))),W.encode(g.s));}
 for(const raw of ['bad','{}','null'])assert.throws(()=>W.decode(raw));
});

test('Encounter rates fall per victory, stop at 1.5%, and survive saving',()=>{
 const g=new W.Adventure(()=>0);g.enter();assert.equal(g.encounterRate,.10);
 for(let n=1;n<=22;n++){
  g.battle(false);g.s.enemy.hp=1;g.act(0);
  assert.ok(Math.abs(g.encounterRate-Math.max(1.5,10-n*.5)/100)<1e-12);
  const h=new W.Adventure();h.restore(W.decode(W.encode(g.s)));assert.equal(h.encounterRate,g.encounterRate);
 }
 assert.equal(g.encounterRate,.015);
 const old=JSON.parse(W.encode(g.s));delete old.encounterDefeats;
 const h=new W.Adventure();h.restore(W.decode(JSON.stringify(old)));assert.equal(h.encounterRate,.10);
 for(const value of [-1,.5,null,'1'])assert.throws(()=>W.decode(JSON.stringify({...old,encounterDefeats:value})));
 // Exercise the actual movement threshold on a passage in the shipped map.
 const [x,y]=W.findTile(0,'E'),d=[0,1,2,3].find(d=>W.tile(0,x+W.dx[d],y+W.dy[d])==='.');assert.notEqual(d,undefined);
 for(const [defeats,random,battle] of [[0,.099,true],[0,.10,false],[1,.094,true],[1,.095,false],[17,.014,true],[17,.015,false]]){
  const h=location(new W.Adventure(()=>random),0);Object.assign(h.s,{direction:d,encounterDefeats:defeats});h.move();assert.equal(h.s.scene,battle?'battle':'dungeon');
 }
});

test('Entry, stairs and successful transfers reset encounter rates; other actions do not',()=>{
 const g=new W.Adventure(()=>0);g.enter();
 const reduce=()=>{g.battle(false);g.s.enemy.hp=1;g.act(0);assert.ok(g.encounterRate<.10);};
 reduce();g.turn(1);assert.ok(g.encounterRate<.10);
 g.battle(false);g.act(5);assert.equal(g.s.encounterDefeats,1);
 const before=g.encounterRate;g.warp(W.floors[1].id);assert.equal(g.encounterRate,before);
 g.s.mp=0;g.warp(W.floors[0].id);assert.equal(g.encounterRate,before);
 g.s.mp=12;g.warp(W.floors[0].id);assert.equal(g.encounterRate,.10);
 reduce();location(g,0,'>');g.interact();assert.equal(g.encounterRate,.10);
 reduce();g.interact();assert.equal(g.encounterRate,.10);assert.equal(g.s.floor,0);
 reduce();g.returnTown();g.enter();assert.equal(g.encounterRate,.10);
 const f=W.townFloors[W.towns[1].id].at(-1);location(g,f,'B');g.battle(true);g.s.enemy.hp=1;g.act(0);assert.ok(Math.abs(g.encounterRate-.095)<1e-12);
});

test('The exploration display distinguishes 5%, the lower limit, and stronger enemy presence',()=>{
 for(const [defeats,intensity,expected] of [[0,'high','敵の気配が濃い'],[9,'high','敵の気配が濃い'],[10,'moderate','敵の気配が減ってきた'],[16,'moderate','敵の気配が減ってきた'],[17,'low','敵の気配は少ない']]){
  const g=new W.Adventure();g.enter();g.s.encounterDefeats=defeats;
  const u=ui(g.s);u.el('continue').onclick();
  const presence=u.el('enemy-presence');assert.equal(presence.hidden,false);assert.equal(presence.textContent,expected);assert.equal(presence.dataset.intensity,intensity);
  u.key('1');u.button('帰還の術');assert.equal(presence.hidden,true);
  u.enter();assert.equal(presence.hidden,false);assert.equal(presence.textContent,'敵の気配が濃い');assert.equal(presence.dataset.intensity,'high');
 }
});

test('Current adventures traverse stairs, collect finite ore and chests, and defeat all guardians',()=>{
 const g=new W.Adventure(()=>.99);Object.assign(g.s,{level:99,weapon:999,armor:999});g.s.hp=g.maxHp;g.s.mp=g.maxMp;
 for(const town of W.towns){
  g.s.town=town.id;g.enter();const list=W.townFloors[town.id];
  for(const [i,f] of list.entries()){
   walk(g,W.findTile(f,'O'));const count=g.s.ores.length;g.interact();g.interact();assert.equal(g.s.ores.length,count+1);assert.equal(g.s.ore,0);
   walk(g,W.findTile(f,'C'));const [x,y]=[g.s.x,g.s.y],gold=g.s.gold;g.interact();assert.ok(g.s.gold>gold);const paid=g.s.gold;g.interact();assert.equal(g.s.gold,paid);assert.equal(g.tileAt(x,y),'.');
   if(i<list.length-1){walk(g,W.findTile(f,'>'));g.interact();assert.equal(g.s.floor,list[i+1]);g.interact();assert.equal(g.s.floor,f);g.interact();}
   else{walk(g,W.findTile(f,'B'));assert.equal(g.s.scene,'battle');g.act(0);assert.ok(g.s.bosses.includes(W.bossKey(f)));}
   W.validate(g.s);
  }
  g.returnTown();assert.equal(g.s.ore,list.length);g.s.ore=0;
 }
 assert.equal(g.s.ores.length,W.floors.length);assert.equal(g.s.cleared,true);
});

function townGame(id){const g=new W.Adventure();g.s.town=id;g.s.floor=W.entryFloor(id);[g.s.x,g.s.y]=W.findTile(g.s.floor,'E');return g;}

test('Defense grows every level and smithing charges only successful upgrades',()=>{
 const hero=new W.Adventure();let defense=hero.defense;
 for(let level=2;level<=99;level++){hero.s.level=level;assert.equal(hero.defense-defense,2);defense=hero.defense;}
 for(const town of W.towns)for(const weapon of [true,false]){
  const g=townGame(town.id);g.visit('smith');
  for(const cost of [400,700,1200]){
   assert.equal(g.upgradeCost(weapon),cost);g.s.ore=1;g.s.gold=cost-1;let before=W.encode(g.s);g.upgrade(weapon);assert.equal(W.encode(g.s),before);
   g.s.ore=0;g.s.gold=cost;before=W.encode(g.s);g.upgrade(weapon);assert.equal(W.encode(g.s),before);
   g.s.ore=1;const stat=weapon?g.power:g.defense;g.upgrade(weapon);assert.equal(g.s.gold,0);assert.equal(g.s.ore,0);assert.equal((weapon?g.power:g.defense)-stat,6);
  }
 }
});

test('Current enemy portraits exist and fit their battle display bounds',()=>{
 for(const e of W.enemies){
  const bytes=fs.readFileSync(__dirname+'/DocRoot/'+e.image);assert.equal(bytes.toString('ascii',1,4),'PNG');assert.equal(bytes[25],6);
  assert.ok(bytes.readUInt32BE(16)<=(e.boss?360:310)&&bytes.readUInt32BE(20)<=268);
  const f=W.floors.findIndex(m=>m.encounterEnemies.includes(e.id)||m.bossEnemy===e.id),g=location(new W.Adventure(),f,e.boss?'B':W.floors[f].level===1?'E':'<');
  g.s.scene='battle';g.s.enemy={kind:e.id,hp:e.health,boss:e.boss};const u=ui(g.s);u.el('continue').onclick();
  const image=u.loadedImages.find(i=>i.value===e.image);assert.ok(image);image.onload();u.frame(1100);
  assert.ok(u.el('enemy-name').textContent.includes(e.name));const draw=u.drawCalls.filter(c=>c[0]===image).at(-1);assert.ok(draw&&draw[7]<=(e.boss?360:310)&&draw[8]<=268);
 }
});

test('The current UI enters each dungeon, moves, saves and reloads',()=>{
 for(const town of W.towns){
  const storage=memoryStorage(),u=ui(townGame(town.id).s,{storage});u.el('continue').onclick();u.enter();const before=u.state();
  u.move('forward');u.frame(280);const after=u.state();assert.equal(after.scene,'dungeon');assert.equal(Math.abs(after.x-before.x)+Math.abs(after.y-before.y),1);
  const reload=ui(null,{storage});reload.el('continue').onclick();assert.deepEqual(reload.state(),after);
  u.key('1');u.button('帰還の術');assert.equal(u.state().scene,'town');
 }
 const fresh=ui();fresh.el('start').onclick();assert.equal(fresh.state().scene,'town');
});

test('Debug cheats use the startup flag, only work in the plaza and persist all floor access',()=>{
 for(const code of ['Digit0','Numpad0']){
  const pageLocation={protocol:'http:',hostname:'localhost'},storage=memoryStorage(),u=ui(townGame(W.towns[0].id).s,{pageLocation,storage});
  u.el('continue').onclick();
  // Changing the location after startup must not change the retained debug flag.
  pageLocation.hostname='example.com';
  u.listeners.keydown({key:'0',code,preventDefault(){}});
  const s=u.state();assert.equal(s.level,99);assert.equal(s.gold,1000000);assert.equal(s.ore,99);
  assert.deepEqual(s.reachedFloors,W.floors.map(f=>f.id));
  const reload=ui(null,{storage});reload.el('continue').onclick();assert.deepEqual(reload.state(),s);
  const g=new W.Adventure();g.restore(s);
  for(const town of W.towns){g.s.town=town.id;assert.deepEqual(g.warpFloors(),W.townFloors[town.id]);}
 }
 for(const scene of ['town','facility','dungeon']){
  const g=townGame(W.towns[0].id);if(scene==='facility')g.visit('smith');if(scene==='dungeon')g.enter();
  const pageLocation={protocol:'http:',hostname:scene==='town'?'example.com':'localhost'},u=ui(g.s,{pageLocation});u.el('continue').onclick();
  pageLocation.hostname='localhost';const before=W.encode(u.state());u.key('0');assert.equal(W.encode(u.state()),before);
 }
});

test('Dialogue reveal finishes as complete plain text after normal and delayed frames',()=>{
 for(const reducedMotion of [false,true])for(const delayed of [false,true]){
  const town=W.towns[0],guest=town.facilities.tavern.guests[2],g=townGame(town.id);g.visit('tavern');
  const u=ui(g.s,{reducedMotion});u.el('continue').onclick();u.clickCommand(2);
  const journal=u.el('journal'),expected=[guest.name+' · '+guest.role,...guest.dialogue];
  assert.deepEqual(journal.children.map(p=>p.textContent),expected);
  if(!reducedMotion){
   const characters=journal.children.flatMap(p=>p.children);
   assert.ok(characters.length>0);assert.ok(characters.every(c=>c.style.visibility==='hidden'));
   u.frame(120);
   const visible=characters.filter(c=>c.style.visibility==='visible').length;
   assert.ok(visible>0&&visible<characters.length);
  }
  if(delayed)u.frame(10000);else for(let i=0;i<240;i++)u.frame(16);
  assert.deepEqual(journal.children.map(p=>p.textContent),expected);
  assert.ok(journal.children.every(p=>p.children.length===0),'finished dialogue must contain plain text with no hidden characters');
 }
 const g=townGame(W.towns[0].id);g.visit('tavern');const u=ui(g.s);u.el('continue').onclick();u.clickCommand(0);u.frame(120);
 u.clickCommand(0);u.frame(400);u.clickCommand(2);u.frame(10000);
 assert.match(u.el('journal').textContent,/なるだろう。$/);
});

test('Smith confirmation shows current prices and cancellation does not spend resources',()=>{
 for(const town of W.towns)for(const weapon of [true,false]){
  const g=townGame(town.id);g.s.gold=1100;g.s.ore=2;g.visit('smith');const u=ui(g.s,{reducedMotion:true});u.el('continue').onclick();
  const before=W.encode(u.state());u.clickCommand(weapon?0:1);assert.match(u.el('journal').textContent,/鉱石1個と400G/);u.clickCommand(1);assert.equal(W.encode(u.state()),before);
  u.clickCommand(weapon?0:1);u.clickCommand(0);assert.equal(u.state().gold,700);u.clickCommand(weapon?0:1);assert.match(u.el('journal').textContent,/鉱石1個と700G/);
  u.clickCommand(0);assert.equal(u.state().gold,0);assert.equal(u.state().ore,0);assert.equal(u.state()[weapon?'weapon':'armor'],2);
 }
});

test('Collected chests disappear and remain collected after reloading',()=>{
 for(const town of W.towns){
  const g=location(new W.Adventure(),W.entryFloor(town.id),'C'),storage=memoryStorage(),u=ui(g.s,{storage});u.el('continue').onclick();assert.match(u.el('view-caption').textContent,/宝箱/);
  u.texts.length=0;u.key('e');assert.doesNotMatch(u.el('view-caption').textContent,/宝箱/);assert.ok(!u.texts.some(t=>t[0]==='宝箱'));const before=W.encode(u.state());u.key('e');assert.equal(W.encode(u.state()),before);
  const reload=ui(null,{storage});reload.el('continue').onclick();assert.doesNotMatch(reload.el('view-caption').textContent,/宝箱/);
 }
});

test('Current markers use triangles, green ore and purple descending stairs',()=>{
 for(const [symbol,label,color] of [['E','▲ 地上出口',null],['<','▲ 上り階段',null],['>','▼ 下り階段','#c7a0ef'],['O','魔法の鉱石','#83d79b']]){
  const f=W.floors.findIndex(m=>m.rows.some(r=>r.includes(symbol))),u=ui(location(new W.Adventure(),f,symbol).s);u.el('continue').onclick();
  assert.ok(u.texts.some(t=>t[0]===label));if(color)assert.ok(u.fills.some(f=>f.color===color));if(symbol!=='O')assert.ok(u.mapTexts.some(t=>t[0]===(symbol==='>'?'▼':'▲')));
 }
 // Find examples in the current maps instead of storing test-only geometry.
 for(const [forward,lateral,blocked,visible] of [[3,0,false,true],[4,0,false,false],[2,1,false,true],[2,1,true,false]]){
  let sample;
  for(let f=0;f<W.floors.length&&!sample;f++){
   const [tx,ty]=W.findTile(f,'O');
   for(let d=0;d<4;d++){
    const dx=W.dx[d],dy=W.dy[d],x=tx-dx*forward+dy*lateral,y=ty-dy*forward-dx*lateral;
    if(W.tile(f,x,y)==='#')continue;
    const cx=x+.5-dx,cy=y+.5-dy,start=[Math.floor(cx),Math.floor(cy)];let wall=false;
    for(let i=1;i<=400;i++){const xx=Math.floor(cx+(tx+.5-cx)*i/400),yy=Math.floor(cy+(ty+.5-cy)*i/400);if(xx===start[0]&&yy===start[1])continue;if(W.tile(f,xx,yy)==='#'){wall=true;break;}}
    if(wall===blocked){sample={f,x,y,d};break;}
   }
  }
  assert.ok(sample,'current map must contain a visibility example');
  const g=location(new W.Adventure(),sample.f,W.floors[sample.f].level===1?'E':'<');Object.assign(g.s,{x:sample.x,y:sample.y,direction:sample.d});
  const u=ui(g.s);u.el('continue').onclick();assert.equal(u.texts.some(t=>t[0]==='魔法の鉱石'&&t.alpha>0),visible);
 }
});

test('Turning caps wall interiors at the clip plane instead of showing walls beyond them',()=>{
 let sample;
 for(let f=0;f<W.floors.length&&!sample;f++)for(let y=1;y<W.maps[f].length-1&&!sample;y++)for(let x=1;x<W.maps[f][y].length-1;x++){
  if(W.tile(f,x,y)!=='#'&&W.dx.filter((dx,d)=>W.tile(f,x+dx,y+W.dy[d])==='#').length===3){sample={f,x,y};break;}
 }
 assert.ok(sample,'current maps must contain a dead end with rear and side walls');
 for(const images of [true,false])for(let direction=0;direction<4;direction++)for(const [move,turn,duration] of [['left',-1,260],['right',1,260],['around',2,460]]){
  const {f,x,y}=sample,g=location(new W.Adventure(),f,W.floors[f].level===1?'E':'<');Object.assign(g.s,{x,y,direction});
  const u=ui(g.s,{images});u.el('continue').onclick();
  const wall=images&&u.loadedImages.find(img=>img.value===W.floors[f].wallTexture);if(wall)wall.onload();
  u.move(move);let cappedColumns=0;
  for(let step=1;step<20;step++){
   u.drawCalls.length=0;u.rects.length=0;u.frame(duration/20);
   const t=step/20,ease=t*t*(3-2*t),angle=(direction+turn*ease)*Math.PI/2,dx=Math.sin(angle),dy=-Math.cos(angle);
   for(let col=0;col<720;col+=2){
    const lateral=.66*(2*col/720-1),cx=x+.5-dy*lateral,cy=y+.5+dx*lateral;
    if(W.tile(f,Math.floor(cx),Math.floor(cy))!=='#')continue;
    cappedColumns++;
    if(images){const strip=u.drawCalls.find(a=>a[0]===wall&&a[5]===col);assert.ok(strip,`${move}: wall strip at ${col}`);assert.equal(strip[6],0);assert.equal(strip[8],400);}
    else assert.ok(u.rects.some(r=>r.args[0]===col&&r.args[1]===0&&r.args[2]===2&&r.args[3]===400),`${move}: solid fallback at ${col}`);
   }
  }
  assert.ok(cappedColumns>0,`${move}: rear/side wall cross-sections exercised`);
  assert.equal(u.state().x,x);assert.equal(u.state().y,y);
  u.frame(duration);assert.equal(u.state().direction,(direction+turn+4)%4);
 }
});

test('Transfer lists show current ore collection and spend MP only on a valid transfer',()=>{
 for(const town of W.towns){
  const list=W.townFloors[town.id],g=location(new W.Adventure(),list[0],'E');let before=W.encode(g.s);g.warp(W.floors[list[1]].id);assert.equal(W.encode(g.s),before);
  g.s.reachedFloors=list.slice(0,3).map(f=>W.floors[f].id);g.s.ores=[W.floors[list[1]].oreId];g.s.oreBag=[...g.s.ores];
  const u=ui(g.s);u.el('continue').onclick();u.key('1');u.key('2');const buttons=u.el('dialog-buttons').children;
  assert.equal(buttons[0].textContent,'地下1階');assert.match(buttons[0].children.at(-1).textContent,/地上出口へ.*魔法の鉱石：未取得/);
  assert.match(buttons[1].children.at(-1).textContent,/魔法の鉱石：取得済み/);assert.match(buttons[2].children.at(-1).textContent,/魔法の鉱石：未取得/);
  before=W.encode(u.state());u.key('4');assert.equal(W.encode(u.state()),before);u.key('2');u.key('2');assert.equal(u.state().floor,list[1]);assert.equal(u.state().mp,g.s.mp-1);
  u.key('1');u.key('2');u.key('1');assert.equal(u.state().floor,list[0]);assert.equal(u.state().scene,'dungeon');assert.equal(u.state().mp,g.s.mp-2);
  assert.deepEqual([u.state().x,u.state().y],W.findTile(list[0],'E'));
  const h=new W.Adventure();h.restore(u.state());h.s.mp=0;before=W.encode(h.s);h.warp(W.floors[list[0]].id);assert.equal(W.encode(h.s),before);
 }
});

test('Victory unlocks at 850 ms despite repeated taps, held keys or held pointers',()=>{
 for(const mode of ['tap','key','pointer']){
  const g=new W.Adventure();g.enter();g.s.scene='battle';g.s.enemy={kind:W.floors[g.s.floor].encounterEnemies[0],hp:1,boss:false};
  const u=ui(g.s);u.el('continue').onclick();u.frame(1100);u.clickCommand(0);const saved=W.encode(u.state());
  function input(){if(mode==='pointer'){u.listeners.pointerdown?.({pointerId:1});u.clickCommand(0);}else{u.listeners.keydown({key:'1',repeat:mode==='key',preventDefault(){}});if(mode==='tap')u.listeners.keyup?.({key:'1'});}}
  for(let i=0;i<33;i++){input();u.frame(25);}input();u.frame(24);assert.ok(u.moves.every(b=>b.disabled));input();u.frame(1);
  assert.ok(u.moves.every(b=>!b.disabled));assert.equal(W.encode(u.state()),saved);u.key('1');assert.equal(u.el('dialog-title').textContent,'アクション');
 }
});

test('Level-up stars occur only on level gains and do not block exploration',()=>{
 for(const [xp,reduced] of [[44,false],[0,false],[44,true]]){
  const g=new W.Adventure();g.enter();g.s.scene='battle';g.s.xp=xp;g.s.enemy={kind:W.floors[g.s.floor].encounterEnemies[0],hp:1,boss:false};
  const u=ui(g.s,{reducedMotion:reduced});u.el('continue').onclick();u.frame(1100);u.clickCommand(0);const layer=u.el('level-up-effect');assert.equal(layer.children.length,0);u.frame(850);
  assert.ok(u.moves.every(b=>!b.disabled));assert.equal(layer.children.length,xp&&!reduced?54:0);
  if(xp){assert.equal(u.state().level,2);assert.match(u.el('equipment').textContent,/防 2/);assert.match(u.el('toast').textContent,/LEVEL UP/);}
  const reload=ui(u.state());reload.el('continue').onclick();assert.equal(reload.el('level-up-effect').children.length,0);u.frame(3000);assert.equal(layer.children.length,0);
 }
});

console.log('\n'+checks+' current-spec groups passed.');
