'use strict';
// Game rules and save migration are independent of rendering and browser storage.
const Browsardry = (() => {
  // 通常の通路を1歩進むごとの敵遭遇率（％）。減少値は討伐1体あたり。
  const INITIAL_ENCOUNTER_PERCENT = 10;
  const ENCOUNTER_PERCENT_DECREASE = 0.5;
  const MIN_ENCOUNTER_PERCENT = 1.5;
  const node=typeof module!=='undefined';
  const towns=node?require('./data/towns.js'):BrowsardryTowns;
  const mapData=node?require('./data/maps.js'):BrowsardryMaps;
  // Accept legacy full-width map symbols before validation and save hashing.
  // Accept the original ASCII notation as well, for existing content and tools.
  const mapSymbols={'■':'#','　':'.','Ｅ':'E','＜':'<','＞':'>','宝':'C','鉱':'O','Ｂ':'B'};
  const floors=Array.isArray(mapData)?mapData.map(f=>f&&({...f,rows:Array.isArray(f.rows)?f.rows.map(r=>typeof r==='string'?r.replace(/[■　Ｅ＜＞宝鉱Ｂ]/g,c=>mapSymbols[c]):r):f.rows})):mapData;
  const enemies=node?require('./data/enemies.js'):BrowsardryEnemies;
  const facilities=['tavern','smith','pharmacy','inn'];
  const id=n=>Number.isSafeInteger(n)&&n>=0;
  const amount=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
  const text=s=>typeof s==='string'&&s.trim().length>0;
  const image=s=>text(s)&&s.startsWith('./')&&s.length>2&&!s.includes('..')&&!s.includes('\\');
  const uniqueIds=a=>Array.isArray(a)&&a.length>0&&a.every(v=>v&&id(v.id))&&new Set(a.map(v=>v.id)).size===a.length;
  if(!uniqueIds(towns)||towns.some(t=>!text(t.name)||!text(t.region)||!image(t.image)||(t.travelImage!==undefined&&!image(t.travelImage))||!amount(t.innCost)||!amount(t.potionCost)||!t.facilities||facilities.some(k=>!text(t.facilities[k]?.name)||(t.facilities[k].image!==undefined&&!image(t.facilities[k].image))||!Array.isArray(t.facilities[k].info)||!t.facilities[k].info.length||t.facilities[k].info.some(v=>!text(v)))||!Array.isArray(t.routes)))throw Error('data/towns.js の街定義が不正です。');
  const townById=Object.fromEntries(towns.map(t=>[t.id,t]));
  if(towns.some(t=>{const guests=t.facilities.tavern.guests;return !Array.isArray(guests)||guests.length!==3||new Set(guests.map(g=>g?.id)).size!==3||guests.some(g=>!g||!text(g.id)||!text(g.name)||!text(g.role)||!image(g.image)||!Array.isArray(g.dialogue)||!g.dialogue.length||g.dialogue.some(line=>!text(line)));}))throw Error('data/towns.js の酒場の客は、固有ID・名前・肩書き・立ち絵・会話を持つ3人を定義してください。');
  if(towns.some(t=>['smith','pharmacy','inn'].some(k=>{const o=t.facilities[k].owner;return !o||!text(o.id)||!text(o.name)||!text(o.role)||!image(o.image)||!o.offers||(k==='smith'?['weapon','armor']:k==='inn'?['rest']:['buy']).some(a=>!Array.isArray(o.offers[a])||!o.offers[a].length||o.offers[a].some(line=>!text(line)));})))throw Error('data/towns.js の店主はID・名前・肩書き・立ち絵・確認の台詞を定義してください。');
  if(towns.some(t=>new Set(t.routes.map(r=>r.town)).size!==t.routes.length||t.routes.some(r=>!id(r.town)||!townById[r.town]||r.town===t.id||!amount(r.cost))))throw Error('data/towns.js の交通路が不正です。');
  if(!uniqueIds(enemies)||enemies.some(e=>!text(e.name)||!id(e.town)||typeof e.boss!=='boolean'||['health','attack','experience','gold'].some(k=>!amount(e[k])||(k==='health'&&e[k]===0))||!image(e.image)||(e.finalBoss!==undefined&&(typeof e.finalBoss!=='boolean'||e.finalBoss&&!e.boss))))throw Error('data/enemies.js の敵定義が不正です。');
  if(enemies.filter(e=>e.finalBoss).length>1)throw Error('data/enemies.js の最終ボスは1体までです。');
  const enemyById=Object.fromEntries(enemies.map(e=>[e.id,e]));
  if(!uniqueIds(floors)||floors.some(f=>!townById[f.town]||!Number.isInteger(f.level)||f.level<1||!text(f.name)||!text(f.oreId)||f.oreId.length>200||!Array.isArray(f.rows)||f.rows.length<3||typeof f.rows[0]!=='string'||f.rows[0].length<3||f.rows.some((r,y)=>typeof r!=='string'||r.length!==f.rows[0].length||!/^[#.E<>CBO]+$/.test(r)||r[0]!=='#'||r.at(-1)!=='#'||(y===0||y===f.rows.length-1)&&!/^#+$/.test(r))))throw Error('data/maps.js のマップ定義が不正です。');
  const floorIndex=new Map(floors.map((f,i)=>[f.id,i]));
  const townFloors=Object.fromEntries(towns.map(t=>[t.id,floors.map((f,i)=>i).filter(i=>floors[i].town===t.id).sort((a,b)=>floors[a].level-floors[b].level)]));
  if(new Set(floors.map(f=>f.oreId)).size!==floors.length||towns.some(t=>!townFloors[t.id].length||townFloors[t.id].some((i,n,list)=>{
    const f=floors[i],count=c=>f.rows.join('').split(c).length-1;
    return f.level!==n+1||count('O')!==1||count('E')!==(n===0?1:0)||count('<')!==(n>0?1:0)||count('>')!==(n<list.length-1?1:0)||count('B')!==(n===list.length-1?1:0);
  })))throw Error('data/maps.js の出口・階段・ボス・鉱石の定義が不正です。');
  if(floors.some(f=>!Array.isArray(f.encounterEnemies)||new Set(f.encounterEnemies).size!==f.encounterEnemies.length||f.encounterEnemies.some(n=>!id(n)||!enemyById[n]||enemyById[n].boss||enemyById[n].town!==f.town)||
    (f.rows.some(r=>r.includes('B'))?(!id(f.bossEnemy)||!enemyById[f.bossEnemy]?.boss||enemyById[f.bossEnemy].town!==f.town):f.bossEnemy!==null)||!image(f.wallTexture)))throw Error('data/maps.js の出現敵・ボス・壁テクスチャの定義が不正です。');
  const maps=floors.map(f=>f.rows),dimensions=floors.map(f=>({width:f.rows[0].length,height:f.rows.length}));
  const totalCells=dimensions.reduce((n,d)=>n+d.width*d.height,0);
  const names=Object.fromEntries(enemies.map(e=>[e.id,e.name])),health=Object.fromEntries(enemies.map(e=>[e.id,e.health]));
  const attacks=Object.fromEntries(enemies.map(e=>[e.id,e.attack])),experience=Object.fromEntries(enemies.map(e=>[e.id,e.experience])),gold=Object.fromEntries(enemies.map(e=>[e.id,e.gold]));
  const dx=[0,1,0,-1],dy=[-1,0,1,0];
  const tile=(f,x,y)=>maps[f]?.[y]?.[x]??'#';
  // Generated endpoints may face any direction. Prefer east when it is open.
  const passageDirection=(f,x,y)=>[1,2,3,0].find(d=>tile(f,x+dx[d],y+dy[d])!=='#')??1;
  const key=(f,x,y)=>`${floors[f].id}:${x}:${y}`;
  const bossKey=f=>`boss:${floors[f].id}`;
  const entryFloor=town=>townFloors[town][0];
  const lastFloor=town=>townFloors[town].at(-1);
  const finalFloor=lastFloor(towns[0].id);
  const adjacent=(f,n)=>townFloors[floors[f].town][floors[f].level-1+n];
  const findTile=(f,t)=>{for(let y=0;y<maps[f].length;y++){const x=maps[f][y].indexOf(t);if(x>=0)return [x,y];}throw Error('data/maps.js のイベントがありません。');};
  const layouts=floors.map(f=>{let hash=2166136261;for(const c of f.rows.join('\n'))hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0).toString(16);});
  const completed=s=>towns.every(t=>s.bosses.includes(bossKey(lastFloor(t.id))));
  function initial(){const town=towns[0].id,floor=entryFloor(town),[x,y]=findTile(floor,'E');return {version:3,scene:'town',facility:null,town,floor,x,y,direction:1,level:1,xp:0,hp:36,mp:12,gold:65,potions:3,weapon:0,armor:0,ore:0,oreBag:[],ores:[],cleared:false,explored:[],reachedFloors:[],chests:[],bosses:[],enemy:null,encounterDefeats:0};}
  function recoverReached(data){
    const found=new Set();
    if(data.scene!=='town'&&floorIndex.has(data.floor))found.add(data.floor);
    for(const entry of data.explored||[]){
      const n=typeof entry==='string'?Number(entry.split(':')[0]):entry?.id;
      if(floorIndex.has(n)&&(typeof entry==='string'||/[1-9a-f]/.test(entry.cells||'')))found.add(n);
    }
    for(const f of floors)if(data.ores?.includes(f.oreId)||data.bosses?.includes(`boss:${f.id}`))found.add(f.id);
    return [...found];
  }
  const list=a=>Array.isArray(a)&&a.length<=100000&&new Set(a).size===a.length&&a.every(v=>typeof v==='string'&&v.length>0&&v.length<=200);
  function validate(s){
    if(!id(s?.encounterDefeats))throw Error('遭遇率の記録が不正です。');
    if(!s||s.version!==3||!['town','dungeon','battle'].includes(s.scene)||!id(s.town)||!townById[s.town]||!Number.isInteger(s.floor)||!floors[s.floor]||floors[s.floor].town!==s.town)throw Error('冒険の記録が不正です。');
    const ranges={x:[0,dimensions[s.floor].width-1],y:[0,dimensions[s.floor].height-1],direction:[0,3],level:[1,99],xp:[0,4454],hp:[1,918],mp:[0,306],gold:[0,100000000],potions:[0,99],weapon:[0,999],armor:[0,999],ore:[0,100000]};
    for(const [k,[lo,hi]] of Object.entries(ranges))if(!Number.isSafeInteger(s[k])||s[k]<lo||s[k]>hi)throw Error('能力値の記録が不正です。');
    if(tile(s.floor,s.x,s.y)==='#'||s.hp>36+(s.level-1)*9||s.mp>12+(s.level-1)*3||s.xp>=s.level*45||!(s.facility===null||s.scene==='town'&&[...facilities,'travel'].includes(s.facility)))throw Error('冒険の記録が不正です。');
    for(const k of ['explored','chests','bosses','ores','oreBag'])if(!list(s[k]))throw Error('探索の記録が不正です。');
    if(!Array.isArray(s.reachedFloors)||s.reachedFloors.length>100000||new Set(s.reachedFloors).size!==s.reachedFloors.length||s.reachedFloors.some(n=>!id(n)))throw Error('到達階層の記録が不正です。');
    if(s.oreBag.some(k=>!s.ores.includes(k))||s.scene==='town'&&s.oreBag.length||typeof s.cleared!=='boolean'||s.cleared!==completed(s))throw Error('探索の記録が不正です。');
    for(const k of s.explored){const m=/^(\d+):(\d+):(\d+)$/.exec(k),f=m&&floorIndex.get(Number(m[1]));if(!m||f===undefined||Number(m[2])>=dimensions[f].width||Number(m[3])>=dimensions[f].height)throw Error('地図の記録が不正です。');}
    if(s.scene==='battle'){
      const e=s.enemy,def=enemyById[e?.kind];
      if(!e||!id(e.kind)||!def||def.town!==s.town||!Number.isInteger(e.hp)||e.hp<1||e.hp>def.health||e.boss!==def.boss||e.boss&&(floors[s.floor].bossEnemy!==e.kind||tile(s.floor,s.x,s.y)!=='B'||s.bosses.includes(bossKey(s.floor))))throw Error('戦闘の記録が不正です。');
    }else if(s.enemy!==null)throw Error('戦闘の記録が不正です。');
    return s;
  }
  function toTown(s,town=s.town){s.town=townById[town]?town:towns[0].id;s.floor=entryFloor(s.town);[s.x,s.y]=findTile(s.floor,'E');s.direction=1;s.scene='town';s.facility=null;s.enemy=null;s.ore+=s.oreBag.length;s.oreBag=[];}
  function encode(s){
    validate(s);const explored=[];
    for(let f=0;f<floors.length;f++){
      const bits=Array(Math.ceil(dimensions[f].width*dimensions[f].height/4)).fill(0),prefix=floors[f].id+':';let found=false;
      for(const k of s.explored)if(k.startsWith(prefix)){const [,x,y]=k.split(':').map(Number),n=y*dimensions[f].width+x;bits[n>>2]|=1<<(n%4);found=true;}
      if(found)explored.push({id:floors[f].id,layout:layouts[f],cells:bits.map(v=>v.toString(16)).join('')});
    }
    return JSON.stringify({...s,floor:floors[s.floor].id,floorLayout:layouts[s.floor],explored});
  }
  function legacy(a){
    if(![1,2].includes(a[0])||![20,21].includes(a.length)||typeof a[16]!=='string'||!/^[0-9a-f]+$/.test(a[16])||a[16].length!==(a[0]===1?143:414)||!['town','dungeon','battle'].includes(a[1]))throw Error('旧記録を読み込めません。');
    const s=initial(),keys=['version','scene','town','floor','x','y','direction','level','xp','hp','mp','gold','potions','weapon','armor','cleared'];
    keys.forEach((k,i)=>s[k]=a[i]);s.version=3;s.facility=null;
    const sizes=[[13,11],[17,13],[21,15],[25,17],[29,19]];
    const oldKey=n=>{let offset=0;for(let f=0;f<sizes.length;f++){const [w,h]=sizes[f];if(n<offset+w*h)return `${f}:${(n-offset)%w}:${Math.floor((n-offset)/w)}`;offset+=w*h;}return null;};
    if(!id(s.town)||!id(s.floor)||!Number.isInteger(s.x)||!Number.isInteger(s.y)||!Array.isArray(a[17])||!Array.isArray(a[18])||a[17].some(n=>!id(n))||a[18].some(n=>!id(n)))throw Error('旧記録を読み込めません。');
    s.chests=a[0]===2?a[17].map(oldKey).filter(Boolean):[];
    s.bosses=a[18].map(n=>`boss:${a[0]===1&&n===1?4:n}`);s.explored=[];
    if(a[0]===2)for(let n=0;n<1655;n++)if(parseInt(a[16][n>>2],16)&1<<(n%4)){const k=oldKey(n),[f,x,y]=k.split(':').map(Number),i=floorIndex.get(f);if(i!==undefined&&x<dimensions[i].width&&y<dimensions[i].height)s.explored.push(k);}
    s.enemy=a[19];s.floorLayout=null;
    s.reachedFloors=recoverReached(s);
    // Legacy saves have no layout hash. Generated replacements cannot reuse
    // their old coordinates or exploration bits, even if a cell is still open.
    if(a[0]===1||floors.some(f=>f.generation)){
      s.scene='town';s.enemy=null;s.explored=[];
      s.floor=townFloors[s.town]?floors[entryFloor(s.town)].id:floors[0].id;
    }
    return s;
  }
  function decode(raw){
    let data=JSON.parse(raw);if(Array.isArray(data))data=legacy(data);
    if(!data||data.version!==3||!['town','dungeon','battle'].includes(data.scene))throw Error('対応していない保存形式です。');
    const s=initial();
    // Existing saves begin at the initial encounter rate.
    if(data.encounterDefeats!==undefined){if(!id(data.encounterDefeats))throw Error('遭遇率の記録が不正です。');s.encounterDefeats=data.encounterDefeats;}
    for(const k of ['level','xp','hp','mp','gold','potions','weapon','armor','ore','direction']){
      if(!Number.isSafeInteger(data[k])||data[k]<0||(k==='level'||k==='hp')&&data[k]<1)throw Error('能力値の記録が不正です。');s[k]=data[k];
    }
    s.level=Math.min(99,s.level);s.xp=Math.min(s.xp,s.level*45-1);s.hp=Math.min(s.hp,36+(s.level-1)*9);s.mp=Math.min(s.mp,12+(s.level-1)*3);
    for(const [k,max] of Object.entries({gold:100000000,potions:99,weapon:999,armor:999,ore:100000}))s[k]=Math.min(max,s[k]);s.direction%=4;
    for(const k of ['chests','bosses','ores','oreBag']){if(!list(data[k]))throw Error('探索の記録が不正です。');s[k]=[...data[k]];}
    if(data.reachedFloors!==undefined){
      if(!Array.isArray(data.reachedFloors)||data.reachedFloors.length>100000||new Set(data.reachedFloors).size!==data.reachedFloors.length||data.reachedFloors.some(n=>!id(n)))throw Error('到達階層の記録が不正です。');
      s.reachedFloors=[...data.reachedFloors];
    }
    if(s.oreBag.some(k=>!s.ores.includes(k)))throw Error('鉱石の記録が不正です。');
    if(!Array.isArray(data.explored)||data.explored.length>100000)throw Error('地図の記録が不正です。');
    if(data.explored.every(k=>typeof k==='string'))s.explored=data.explored.filter(k=>{const m=/^(\d+):(\d+):(\d+)$/.exec(k),f=m&&floorIndex.get(Number(m[1]));return m&&f!==undefined&&Number(m[2])<dimensions[f].width&&Number(m[3])<dimensions[f].height;});
    else for(const entry of data.explored){
      if(!entry||!id(entry.id)||typeof entry.cells!=='string'||!/^[0-9a-f]+$/.test(entry.cells))throw Error('地図の記録が不正です。');
      const f=floorIndex.get(entry.id);if(f===undefined||entry.layout!==layouts[f])continue;
      const {width,height}=dimensions[f];if(entry.cells.length!==Math.ceil(width*height/4))continue;
      for(let n=0;n<width*height;n++)if(parseInt(entry.cells[n>>2],16)&1<<(n%4))s.explored.push(key(f,n%width,Math.floor(n/width)));
    }
    if(data.reachedFloors===undefined)s.reachedFloors=recoverReached(data);
    s.explored=[...new Set(s.explored)];s.cleared=completed(s);
    const f=floorIndex.get(data.floor),town=townById[data.town]?data.town:towns[0].id;
    if(!id(data.town)||!id(data.floor)||!Number.isInteger(data.x)||!Number.isInteger(data.y))throw Error('現在地の記録が不正です。');
    const safe=f!==undefined&&floors[f].town===town&&town===data.town&&(!data.floorLayout||data.floorLayout===layouts[f])&&tile(f,data.x,data.y)!=='#';
    s.town=town;
    if(data.scene==='town'||!safe){toTown(s,town);if(data.scene==='town'&&safe&&[...facilities,'travel'].includes(data.facility))s.facility=data.facility;}
    else{
      Object.assign(s,{scene:data.scene,floor:f,x:data.x,y:data.y,facility:null,enemy:data.enemy});
      if(s.scene==='battle'){
        const e=s.enemy,def=enemyById[e?.kind];
        if(!e||!id(e.kind)||!Number.isInteger(e.hp)||e.hp<1||typeof e.boss!=='boolean')throw Error('戦闘の記録が不正です。');
        if(!def||def.town!==s.town||def.boss!==e.boss||e.boss&&(floors[f].bossEnemy!==e.kind||tile(f,s.x,s.y)!=='B'||s.bosses.includes(bossKey(f)))){s.scene='dungeon';s.enemy=null;}
        else s.enemy={kind:e.kind,hp:Math.min(e.hp,def.health),boss:e.boss};
      }else s.enemy=null;
    }
    return validate(s);
  }
  class Adventure{
    constructor(rng=Math.random){this.rng=rng;this.s=initial();this.log=[];}
    get town(){return townById[this.s.town];}
    get encounterRate(){return Math.max(MIN_ENCOUNTER_PERCENT,INITIAL_ENCOUNTER_PERCENT-this.s.encounterDefeats*ENCOUNTER_PERCENT_DECREASE)/100;}
    get maxHp(){return 36+(this.s.level-1)*9;}get maxMp(){return 12+(this.s.level-1)*3;}
    get nextXp(){return this.s.level*45;}get power(){return 8+this.s.level*2+this.s.weapon*6;}
    get defense(){return (this.s.level-1)*2+this.s.armor*6;}get innCost(){return this.town.innCost;}
    upgradeCost(weapon){const rank=this.s[weapon?'weapon':'armor'];return 400+200*rank+100*rank*rank;}
    tileAt(x,y,floor=this.s.floor){const t=tile(floor,x,y);return t==='C'&&this.s.chests.includes(key(floor,x,y))?'.':t;}
    roll(lo,hi){return lo+Math.floor(this.rng()*(hi-lo));}
    say(t){this.log.push(t);if(this.log.length>5)this.log.shift();}
    restore(s){this.s=validate(s);this.log=[];this.say('旅の記録を読み込みました。');}
    newGame(){this.s=initial();this.log=[];this.say('街の酒場で迷宮の話を聞き、広場から探索に出かけよう。');}
    spend(n){if(this.s.gold<n){this.say(`金貨が足りません。必要 ${n}G。`);return false;}this.s.gold-=n;return true;}
    visit(facility){if(this.s.scene!=='town'||![...facilities,'travel'].includes(facility))return;this.s.facility=facility;this.say(facility==='travel'?'次に向かう街を選ぼう。':this.town.facilities[facility].info[0]);}
    leave(){if(this.s.scene==='town')this.s.facility=null;}
    travel(town){if(this.s.scene!=='town'||this.s.facility!=='travel')return;const route=this.town.routes.find(r=>r.town===town);if(!route||!this.spend(route.cost))return;toTown(this.s,town);this.say(`${this.town.name}に到着。交通費 ${route.cost}G。`);}
    rest(){if(this.s.scene==='town'&&this.s.facility==='inn'&&this.spend(this.innCost)){this.s.hp=this.maxHp;this.s.mp=this.maxMp;this.say('宿で休み、HPとMPが全回復した。');}}
    buyPotion(){if(this.s.scene!=='town'||this.s.facility!=='pharmacy')return;if(this.s.potions>=99){this.say('回復薬は99個まで持てます。');return;}if(this.spend(this.town.potionCost)){this.s.potions++;this.say('回復薬を買った。HPを28回復できる。');}}
    upgrade(weapon){const s=this.s,k=weapon?'weapon':'armor';if(s.scene!=='town'||s.facility!=='smith')return;if(!s.ore){this.say('魔法の鉱石がありません。迷宮で回収し、街へ持ち帰ってください。');return;}if(s[k]>=999){this.say('これ以上は強化できません。');return;}const cost=this.upgradeCost(weapon);if(!this.spend(cost))return;s.ore--;s[k]++;this.say(`${weapon?'武器':'防具'}を強化した！ 魔法の鉱石1個と${cost}Gを使用。`);}

    reveal(){const s=this.s,set=new Set(s.explored);if(!s.reachedFloors.includes(floors[s.floor].id))s.reachedFloors.push(floors[s.floor].id);for(let y=s.y-1;y<=s.y+1;y++)for(let x=s.x-1;x<=s.x+1;x++)if(x>=0&&x<dimensions[s.floor].width&&y>=0&&y<dimensions[s.floor].height)set.add(key(s.floor,x,y));s.explored=[...set];}
    enter(){const s=this.s;if(s.scene!=='town'||s.facility!==null)return;s.floor=entryFloor(s.town);[s.x,s.y]=findTile(s.floor,'E');s.facility=null;s.direction=passageDirection(s.floor,s.x,s.y);s.scene='dungeon';s.encounterDefeats=0;this.reveal();this.say('迷宮に入った。足元の出口を調べると街に戻れる。');}
    turn(n){if(this.s.scene==='dungeon')this.s.direction=(this.s.direction+n+4)%4;}
    move(){const s=this.s;if(s.scene!=='dungeon')return false;const d=s.direction,x=s.x+dx[d],y=s.y+dy[d];
      if(tile(s.floor,x,y)==='#'){this.say('石壁が行く手を阻む。');return false;}s.x=x;s.y=y;this.reveal();const t=this.tileAt(x,y);
      if(t==='B'&&!s.bosses.includes(bossKey(s.floor)))this.battle(true);else if(t==='.'&&floors[s.floor].encounterEnemies.length&&this.rng()<this.encounterRate)this.battle(false);else if(t!=='.')this.say({'E':'地上への出口。調べると街へ。','>':'下り階段。調べると地下へ。','<':'上り階段。調べると上の階へ。','C':'古びた宝箱。足元を調べよう。','O':s.ores.includes(floors[s.floor].oreId)?'鉱石は採掘済みだ。':'魔法の鉱石。足元を調べて持ち帰ろう。','B':'守護者の気配はもうない。'}[t]);return true;
    }
    interact(){const s=this.s;if(s.scene!=='dungeon')return;switch(this.tileAt(s.x,s.y)){
      case 'E':this.returnTown();break;
      case '>':s.encounterDefeats=0;s.floor=adjacent(s.floor,1);[s.x,s.y]=findTile(s.floor,'<');s.direction=passageDirection(s.floor,s.x,s.y);this.reveal();this.say(`地下${floors[s.floor].level}階へ降りた。`);break;
      case '<':s.encounterDefeats=0;s.floor=adjacent(s.floor,-1);[s.x,s.y]=findTile(s.floor,'>');s.direction=passageDirection(s.floor,s.x,s.y);this.reveal();this.say('階段を上った。');break;
      case 'C':{const k=key(s.floor,s.x,s.y);s.chests.push(k);const g=55+(floors[s.floor].level-1)*45;s.gold=Math.min(100000000,s.gold+g);s.potions=Math.min(99,s.potions+1);this.say(`宝箱から ${g}G と回復薬を手に入れた。`);break;}
      case 'O':{const k=floors[s.floor].oreId;if(s.ores.includes(k)){this.say('この階の魔法の鉱石は採掘済みだ。');break;}s.ores.push(k);s.oreBag.push(k);this.say('魔法の鉱石を1個回収した！ 街へ持ち帰ると強化に使える。');break;}
      case 'B':if(!s.bosses.includes(bossKey(s.floor)))this.battle(true);else this.say('この階の守護者は倒した。帰還の術で街に戻ろう。');break;
      default:this.say('ここには何もない。地図を頼りに先へ進もう。');
    }}
    returnTown(){const count=this.s.oreBag.length;toTown(this.s);this.say(`街へ戻った。${count?`魔法の鉱石を${count}個持ち帰った！ 武器屋で強化しよう。`:'次の探索に備えよう。'}`);}
    recall(){const s=this.s;if(s.scene!=='dungeon')return;if(s.mp<3){this.say('帰還にはMPが3必要。出口まで歩いて戻ろう。');return;}s.mp-=3;this.returnTown();}
    warpFloors(){const list=townFloors[this.s.town],deepest=Math.max(1,...list.filter(f=>this.s.reachedFloors.includes(floors[f].id)).map(f=>floors[f].level));return list.filter(f=>floors[f].level<=deepest);}
    warp(floorId){
      const s=this.s;if(s.scene!=='dungeon')return;
      const f=floorIndex.get(floorId);
      if(!this.warpFloors().includes(f)){this.say('到達済みの階層を選んでください。');return;}
      if(s.mp<1){this.say('転移の術にはMPが1必要。');return;}
      s.mp--;s.encounterDefeats=0;s.floor=f;[s.x,s.y]=findTile(f,floors[f].level===1?'E':'<');s.direction=passageDirection(f,s.x,s.y);this.reveal();this.say(`転移の術で地下${floors[f].level}階の${floors[f].level===1?'地上出口':'上り階段'}へ移動した。`);
    }
    battle(boss){const s=this.s,floor=floors[s.floor],pool=floor.encounterEnemies;if(boss?floor.bossEnemy===null:!pool.length)return;if(boss&&enemyById[floor.bossEnemy].finalBoss){const remaining=towns.filter(t=>t.id!==s.town&&!s.bosses.includes(bossKey(lastFloor(t.id))));if(remaining.length){this.say('祭壇は二つの誓約に封じられている。'+remaining.map(t=>t.name+'の守護者').join('と')+'を倒そう。');return;}}const kind=boss?floor.bossEnemy:pool[this.roll(0,pool.length)];s.enemy={kind,hp:health[kind],boss};s.scene='battle';this.say(`${names[kind]} が現れた！`);}
    potion(){const s=this.s;if(s.scene==='battle'){this.act(3);return;}if(s.hp===this.maxHp){this.say('HPはすでに満タンです。');return;}if(!s.potions){this.say('回復薬がありません。');return;}s.potions--;s.hp=Math.min(this.maxHp,s.hp+28);this.say('回復薬でHPを28回復した。');}
    heal(){const s=this.s;if(s.scene!=='dungeon'&&(s.scene!=='town'||s.facility!==null))return;if(s.hp===this.maxHp){this.say('HPはすでに満タンです。');return;}if(s.mp<3){this.say('治癒の術にはMPが3必要。');return;}s.mp-=3;s.hp=Math.min(this.maxHp,s.hp+20+s.level*3);this.say('治癒の術で傷が癒えた。');}
    act(action){const s=this.s,e=s.enemy;if(s.scene!=='battle'||!e)return;let damage=0,guard=false;
      switch(action){
        case 0:damage=this.power+this.roll(-3,5);break;
        case 1:if(s.mp<4){this.say('火炎の術にはMPが4必要。');return;}s.mp-=4;damage=18+s.level*4+this.roll(0,6);break;
        case 2:if(s.mp<3){this.say('治癒の術にはMPが3必要。');return;}if(s.hp===this.maxHp){this.say('HPはすでに満タンです。');return;}s.mp-=3;s.hp=Math.min(this.maxHp,s.hp+20+s.level*3);this.say('治癒の術で傷が癒えた。');break;
        case 3:if(!s.potions){this.say('回復薬がありません。');return;}if(s.hp===this.maxHp){this.say('HPはすでに満タンです。');return;}s.potions--;s.hp=Math.min(this.maxHp,s.hp+28);this.say('回復薬でHPを28回復した。');break;
        case 4:guard=true;s.mp=Math.min(this.maxMp,s.mp+2);this.say('身を守り、MPを2回復した。');break;
        case 5:if(this.rng()<.65){const x=s.x-dx[s.direction],y=s.y-dy[s.direction];if(tile(s.floor,x,y)!=='#'){s.x=x;s.y=y;}s.enemy=null;s.scene='dungeon';this.reveal();this.say('敵から逃げ切った。');return;}this.say('逃げ道をふさがれた！');break;
        default:return;
      }
      if(damage){e.hp-=damage;this.say(`${names[e.kind]} に ${damage} ダメージ。`);}if(e.hp<=0){this.victory(e);return;}
      let hit=Math.max(1,attacks[e.kind]+this.roll(-2,4)-this.defense);if(guard)hit=Math.max(1,Math.floor(hit/3));s.hp-=hit;this.say(`${names[e.kind]} の攻撃！ ${hit} ダメージ。`);
      if(s.hp<=0){const lost=Math.floor(s.gold/2);s.gold-=lost;s.hp=this.maxHp;s.mp=this.maxMp;this.returnTown();this.say(`街の寺院で目覚めた。所持金を半分失った...（${lost}G）`);}
    }
    victory(e){const s=this.s;if(this.encounterRate>MIN_ENCOUNTER_PERCENT/100)s.encounterDefeats++;s.gold=Math.min(100000000,s.gold+gold[e.kind]);s.xp+=experience[e.kind];this.say(`勝利！ ${experience[e.kind]} EXP / ${gold[e.kind]}G を獲得。`);
      while(s.xp>=this.nextXp&&s.level<99){s.xp-=this.nextXp;s.level++;s.hp=this.maxHp;s.mp=this.maxMp;this.say(`レベル ${s.level} に上がった！ HP・MPが全回復。`);}if(s.level===99)s.xp=Math.min(s.xp,this.nextXp-1);
      if(e.boss){const k=bossKey(s.floor);if(!s.bosses.includes(k))s.bosses.push(k);s.cleared=completed(s);this.say(`${enemyById[e.kind].finalBoss?'灰の霧の元凶を倒した！':floors[s.floor].name+'の守護者を倒した！'}${s.cleared?' すべての街に平穏が戻る。冒険達成！':' 他の街の酒場でも情報を集めよう。'}`);}s.scene='dungeon';s.enemy=null;
    }
  }
  return {Adventure,towns,townById,townFloors,facilities,floors,enemies,enemyById,maps,dimensions,totalCells,finalFloor,entryFloor,lastFloor,adjacent,findTile,names,health,dx,dy,tile,key,bossKey,validate,encode,decode,MIN_ENCOUNTER_PERCENT};
})();
if(typeof module!=='undefined')module.exports=Browsardry;
