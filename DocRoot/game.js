'use strict';
(() => {
  const W=Browsardry, game=new W.Adventure(), $=id=>document.getElementById(id);
  const MODERATE_ENCOUNTER_PERCENT = 5;
  const presenceLabels={high:'敵の気配が濃い',moderate:'敵の気配が減ってきた',low:'敵の気配は少ない'};
  const ctx=$('view').getContext('2d'), titleCtx=$('title-canvas').getContext('2d'), mapCtx=$('map').getContext('2d');
  // Read the original Cookie as well as current and backup browser records.
  const cookieName='uizaadorii_v1',storageName='browsardry_save',backupName='browsardry_save_backup';
  const debugEnvironment=location.protocol==='file:'||['http:','https:'].includes(location.protocol)&&
    /^(localhost\.?|127(?:\.\d{1,3}){3}|\[?::1\]?)$/i.test(location.hostname||'');
  let title=true, started=false, mapOpen=false, lastFocus=null, toastTimer, frame=0, selection=0, actions=[], motion=null, encounter=null, defeat=null, placeTransition=null, conversation=null, portraitFade=null, notice=null, levelUpUntil=0;
  const actionKeyNames=new Set(['w','s','a','d','arrowup','arrowdown','arrowleft','arrowright',' ','enter','1','2','3','4','5','6','7','8','9','e','r','p']);
  // Keep only the title or current town's images, sharing each path across roles and enemies.
  const titleImage='./assets/scenery/title.png',images=new Map();
  let imageScope=null;
  function cropSprite(asset){
    const img=asset.img,c=document.createElement('canvas');
    try{
      c.width=img.naturalWidth;c.height=img.naturalHeight;
      const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
      const data=g.getImageData(0,0,c.width,c.height).data;
      let x0=c.width,y0=c.height,x1=-1,y1=-1;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>5){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
      if(x1>=0)asset.crop=[x0,y0,x1-x0+1,y1-y0+1];
    }catch{}finally{c.width=0;c.height=0;}
  }
  function syncImages(){
    const scope=title?'title':`${game.s.town}:${conversation?.id||''}`;
    if(scope===imageScope)return;
    imageScope=scope;
    const needed=new Set(title?[titleImage]:[game.town.image]),spritePaths=new Set();
    if(!title){
      if(conversation)needed.add(conversation.image);
      if(game.town.travelImage)needed.add(game.town.travelImage);
      for(const facility of Object.values(game.town.facilities))if(facility.image)needed.add(facility.image);
      for(const floor of W.floors)if(floor.town===game.s.town)needed.add(floor.wallTexture);
      for(const enemy of W.enemies)if(enemy.town===game.s.town){needed.add(enemy.image);spritePaths.add(enemy.image);}
    }
    for(const [path,asset] of images)if(!needed.has(path)){
      images.delete(path);asset.img.onload=null;asset.img.onerror=null;
      asset.ready=false;asset.crop=null;asset.img.removeAttribute('src');
    }
    const pending=[];
    for(const path of needed){
      let asset=images.get(path);
      if(!asset){
        asset={img:new Image(),ready:false,crop:null,sprite:spritePaths.has(path)};images.set(path,asset);
        asset.img.onload=()=>{
          if(images.get(path)!==asset)return;
          asset.ready=true;if(asset.sprite)cropSprite(asset);
          if(title)drawTitle();else draw();
        };
        asset.img.onerror=()=>{
          if(images.get(path)!==asset)return;
          asset.ready=false;if(title)drawTitle();else draw();
        };
        pending.push([path,asset]);
      }else if(spritePaths.has(path)&&!asset.sprite){asset.sprite=true;if(asset.ready)cropSprite(asset);}
    }
    // Install every entry before requests start, including synchronous failure callbacks.
    for(const [path,asset] of pending)asset.img.src=path;
  }
  function readCookie(){const entry=document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='));return entry?decodeURIComponent(entry.slice(cookieName.length+1)):null;}
  const messageKeys=new WeakMap(),messageReveals=new Map(),messageSegmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('ja',{granularity:'grapheme'}):null;
  function messageLines(element,lines,scope='',restart=false){
    const key=JSON.stringify([scope,lines]);
    if(!restart&&messageKeys.get(element)===key)return;
    messageKeys.set(element,key);
    messageReveals.delete(element);
    const characters=[],paragraphs=[];
    const instant=document.hidden||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    for(const text of lines){
      const p=document.createElement('p');
      if(instant)p.textContent=text;
      else for(const character of messageSegmenter?Array.from(messageSegmenter.segment(text),part=>part.segment):Array.from(text)){
        const span=document.createElement('span');span.textContent=character;
        span.style.visibility='hidden';p.append(span);characters.push(span);
      }
      paragraphs.push(p);
    }
    // Reserve the full layout, then reveal explicitly instead of animating inline glyphs.
    element.replaceChildren(...paragraphs);
    if(!instant&&characters.length)messageReveals.set(element,{start:performance.now(),shown:0,characters,paragraphs,lines:[...lines]});
  }
  function revealMessages(t){
    for(const [element,reveal] of messageReveals){
      const end=document.hidden?reveal.characters.length:Math.min(reveal.characters.length,Math.floor((t-reveal.start)/12)+1);
      while(reveal.shown<end)reveal.characters[reveal.shown++].style.visibility='visible';
      if(reveal.shown===reveal.characters.length){
        // Leave ordinary text once complete, with no per-character styles or animations.
        reveal.paragraphs.forEach((p,i)=>p.textContent=reveal.lines[i]);
        messageReveals.delete(element);
      }
    }
  }
  function toast(t){messageLines($('toast'),[t],'',true);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,Math.max(4500,Array.from(t).length*12+2000));}
  function readRecord(){
    const candidates=[];let failed=false;
    try{for(const key of [storageName,backupName]){const raw=window.localStorage?.getItem(key);if(raw)candidates.push(raw);}}catch{}
    try{const raw=readCookie();if(raw)candidates.push(raw);}catch{failed=true;}
    for(let i=0;i<candidates.length;i++)try{return {raw:candidates[i],state:W.decode(candidates[i]),recovered:i>0};}catch{failed=true;}
    if(failed)throw Error('保存された記録を読み込めません。');return null;
  }
  function save(announce=false){
    if(!started)return false;
    try{
      const raw=W.encode(game.s);let saved=false,existingLocal=false;
      try{const storage=window.localStorage;if(storage){const previous=storage.getItem(storageName);existingLocal=!!(previous||storage.getItem(backupName));if(previous){try{W.decode(previous);storage.setItem(backupName,previous);}catch{}}storage.setItem(storageName,raw);saved=storage.getItem(storageName)===raw;}}catch{}
      if(!saved&&existingLocal)throw Error('保存領域へ書き込めません。前回の記録を保持しています。');
      if(!saved){const value=encodeURIComponent(raw);if(value.length>3600)throw Error('記録を保存するブラウザーの領域が使えません。');document.cookie=`${cookieName}=${value}; Max-Age=31536000; SameSite=Lax`;if(readCookie()!==raw)throw Error('ブラウザーの保存領域が無効です。');}
      if(announce)toast('旅の記録を保存しました。');return true;
    }catch(e){toast('保存できません。'+e.message+(location.protocol==='file:'?' Webサーバー経由で開いてください。':''));return false;}
  }
  function numberButton(button,index){button.dataset.shortcut=String(index+1);button.setAttribute('aria-keyshortcuts',String(index+1));}
  function chooseNumber(e,buttons){if(!/^[1-9]$/.test(e.key))return false;e.preventDefault();const button=buttons[Number(e.key)-1];if(button&&!button.disabled)button.onclick();return true;}
  function syncTitle(){let record=null;try{record=readRecord();}catch{toast('保存された記録を読み込めません。新しい冒険を始められます。');}$('continue').hidden=!record;[$('continue'),$('start')].filter(b=>!b.hidden).forEach(numberButton);if(record){const s=record.state;$('continue').querySelector('span').textContent=`Lv.${s.level} · ${W.townById[s.town].name} · ${s.gold}G`;}}
  function modal(heading,body,buttons){$('dialog').dataset.kind=heading==='アクション'?'actions':'';lastFocus=document.activeElement;$('dialog-title').textContent=heading;messageLines($('dialog-body'),body,heading,true);$('dialog-buttons').replaceChildren();for(const [index,[text,fn,primary,sub]] of buttons.entries()){const b=document.createElement('button');b.textContent=text;numberButton(b,index);if(sub){const span=document.createElement('span');span.textContent=sub;b.append(span);}if(primary)b.className='primary';b.onclick=()=>{$('dialog').close();if(lastFocus?.isConnected)lastFocus.focus();fn?.();};$('dialog-buttons').append(b);}$('dialog').showModal();}
  function portraitOpacity(){if(!portraitFade)return 1;if(portraitFade.start===null)return 0;const t=Math.min(1,Math.max(0,(performance.now()-portraitFade.start)/portraitFade.duration)),ease=t*t*(3-2*t);return portraitFade.from+(portraitFade.to-portraitFade.from)*ease;}
  function talk(guest){conversation=guest;portraitFade=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?null:{start:null,from:0,to:1,duration:320};notice=null;selection=0;render();$('commands').children[0]?.focus({preventScroll:true});$('view').scrollIntoView({block:'nearest'});}
  function shopOffer(action){
    const owner=game.town.facilities[game.s.facility].owner,s=game.s;
    const values={cost:action==='rest'?`${game.innCost}G`:action==='buy'?`${game.town.potionCost}G`:`魔法の鉱石1個と${game.upgradeCost(action==='weapon')}G`,effect:action==='weapon'?`攻撃力+6（${game.power} → ${game.power+6}）`:`防御力+6（${game.defense} → ${game.defense+6}）`,count:s.potions};
    const guest={...owner,dialogue:owner.offers[action].map(line=>line.replace(/\{(\w+)\}/g,(_,key)=>values[key])),shop:{action,phase:'confirm'}};
    if(conversation?.id===owner.id){conversation=guest;notice=null;render();$('commands').children[0]?.focus({preventScroll:true});}
    else talk(guest);
  }
  function confirmShop(){
    if(conversation?.shop?.phase!=='confirm')return;
    const action=conversation.shop.action,resting=action==='rest'&&game.s.gold>=game.innCost;
    run(()=>{if(action==='weapon'||action==='armor')game.upgrade(action==='weapon');else if(action==='rest')game.rest();else game.buyPotion();conversation.dialogue=[game.log.at(-1)];conversation.shop.phase='result';},action==='weapon'||action==='armor'?'upgrade':null,resting);
  }
  function useShopPotion(){
    run(()=>{game.potion();if(conversation)conversation.dialogue=[game.log.at(-1)];},'heal');
  }
  function finishTalk(){
    if(!conversation||portraitFade?.to===0)return;
    const opacity=images.get(conversation.image)?.ready?portraitOpacity():0;
    if(opacity<=0||document.hidden||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){closeTalk();return;}
    portraitFade={start:performance.now(),from:opacity,to:0,duration:320*opacity};render();
  }
  function closeTalk(){const index=conversation.shop?(conversation.shop.action==='armor'?1:0):game.town.facilities.tavern.guests.indexOf(conversation);conversation=null;portraitFade=null;notice=null;selection=Math.max(0,index);render();$('commands').children[selection]?.focus({preventScroll:true});}
  function showMenu(){if(placeTransition||motion||encounter||defeat||portraitFade?.to===0)return;modal('旅のメニュー',[`Lv.${game.s.level} · ${game.s.cleared?'冒険達成':'冒険の途中'} · 行動ごとに自動保存`],[['冒険に戻る',null,true],['記録を保存',()=>save(true)],['記録を読み込む',()=>modal('記録の読込',['現在の状態を保存された記録に置き換えます。'],[['読み込む',load,true],['やめる']])],['保存してタイトルへ',()=>{save();conversation=null;portraitFade=null;notice=null;clearLevelUp();title=true;render();syncTitle();}] ]);}
  function load(){try{const record=readRecord();if(!record)throw Error('記録がありません。');const original=JSON.parse(record.raw),old=Array.isArray(original),relocated=!old&&(original.town!==record.state.town||original.scene!=='town'&&record.state.scene==='town');game.restore(record.state);clearLevelUp();conversation=null;portraitFade=null;notice=null;started=true;title=false;selection=0;if(game.s.scene==='battle')beginEncounter();else render();if(save()){if(record.recovered)toast('予備の記録から復元しました。');else if(old)toast('旧記録を移行しました。能力値・装備・所持品を引き継ぎました。');else if(relocated)toast('世界の更新に合わせ、安全な街へ移動しました。能力値・装備・所持品は引き継いでいます。');}}catch(e){toast('読込できません。'+e.message);}}
  function start(){clearLevelUp();game.newGame();conversation=null;portraitFade=null;notice=null;started=true;title=false;selection=0;save();render();}
  $('start').onclick=()=>{let hasRecord=started;try{hasRecord=hasRecord||!!readRecord();}catch{hasRecord=true;}if(hasRecord)modal('新しい冒険',['現在の冒険の記録を上書きして、最初から始めます。'],[['はじめから',start,true],['やめる']]);else start();};
  $('continue').onclick=load;$('menu').onclick=showMenu;
  function updateMapToggleLabel(){$('map-toggle').textContent=(game.s.scene==='dungeon'?'9: ':'')+(mapOpen?'地図を閉じる':'周辺地図');}
  $('map-toggle').onclick=()=>{if(placeTransition||motion||encounter||defeat||portraitFade?.to===0)return;mapOpen=!mapOpen;$('map').hidden=!mapOpen;updateMapToggleLabel();};
  function showResult(oldLevel,cleared){if(game.s.level>oldLevel){toast(`LEVEL UP · Lv.${game.s.level} — HP・MP全回復`);playLevelUp();}if(!cleared&&game.s.cleared)modal('冒険達成 — Browsardry',['封印聖廟で灰の祭司王を倒し、灰の霧は晴れた。辺境のリンド、王都ミレア、聖都ヴァルドに平穏が戻る。','たった一人の冒険を、街の人々は忘れない。これからも迷宮の探索を続けられます。'],[['旅を続ける',null,true]]);}
  // Ordinary travel fades on place changes; successful transfer spells also fade within a floor.
  function placeKey(){const s=game.s;return s.scene==='town'?`town:${s.town}:${s.facility}`:`dungeon:${s.floor}`;}
  function beginPlaceTransition(sleep=false,death=false,transfer=false){
    clearLevelUp();
    if($('effect').className==='upgrade')clearEffect();
    const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced&&!sleep&&!death)return;
    const snapshot=document.createElement('canvas');snapshot.width=720;snapshot.height=400;
    snapshot.getContext('2d').drawImage($('view'),0,0);
    placeTransition={snapshot,start:performance.now(),duration:sleep?(reduced?1000:1720):560,sleep,transfer,out:reduced?0:320,hold:1000,into:reduced?0:400};
    if(death){clearEffect();Object.assign(placeTransition,{death:true,red:reduced?0:600,black:reduced?0:500,blank:reduced?0:250,hold:3600,into:reduced?0:600,duration:reduced?3600:5550});}
    $('app').dataset.transition=death?'death':sleep?'sleep':'place';
  }
  function finishPlaceTransition(){
    if(!placeTransition)return;
    placeTransition.snapshot.width=0;placeTransition.snapshot.height=0;placeTransition=null;
    $('app').dataset.transition='';render();
  }
  function shadePlace(alpha,color='#080e0c'){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.fillRect(0,0,720,400);ctx.restore();}
  function clearEffect(){$('effect').className='';$('effect').replaceChildren();}
  function clearLevelUp(){levelUpUntil=0;$('level-up-effect').className='';$('level-up-effect').replaceChildren();}
  function playLevelUp(){
    clearLevelUp();
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const layer=$('level-up-effect');
    for(let i=0;i<54;i++){
      const spark=document.createElement('i');spark.className='level-up-spark';
      spark.style.left=`${2+(i*37)%96}%`;spark.style.top=`${8+(i*47)%104}%`;
      spark.style.width=spark.style.height=`${10+(i*7)%16}px`;
      spark.style.animationDelay=`${(i*67)%600}ms`;spark.style.animationDuration=`${1800+(i*71)%600}ms`;
      layer.append(spark);
    }
    levelUpUntil=performance.now()+3000;void layer.offsetWidth;layer.className='active';
  }
  $('level-up-effect').setAttribute('aria-hidden','true');
  $('level-up-effect').addEventListener('animationend',event=>{if(event.target===$('level-up-effect')&&event.animationName==='level-up-glow')clearLevelUp();});
  function playEffect(kind){
    clearEffect();
    if(kind==='upgrade'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    if(kind==='upgrade'){
      for(let i=0;i<28;i++){
        const spark=document.createElement('i');spark.className='upgrade-spark';
        spark.style.left=`${12+(i*37)%76}%`;spark.style.top=`${62+(i*11)%30}%`;
        spark.style.width=spark.style.height=`${7+(i*3)%9}px`;
        spark.style.animationDelay=`${(i*43)%260}ms`;spark.style.animationDuration=`${950+(i*67)%350}ms`;
        $('effect').append(spark);
      }
    }
    void $('effect').offsetWidth;$('effect').className=kind;
  }
  $('effect').setAttribute('aria-hidden','true');
  $('effect').addEventListener('animationend',event=>{if(event.target===$('effect')&&event.animationName==='upgrade-glow')clearEffect();});
  function run(fn,effect,sleep=false){
    if(placeTransition||motion||encounter||defeat||portraitFade?.to===0)return;
    const oldPlace=placeKey(),oldScene=game.s.scene,oldEnemy=game.s.enemy,oldHp=game.s.hp,oldMp=game.s.mp,oldLevel=game.s.level,oldEquipment=game.s.weapon+game.s.armor,cleared=game.s.cleared;
    game.log=[];
    fn();
    if(game.log.length)messageKeys.delete($('journal'));
    const transfer=effect==='transfer'&&game.s.mp<oldMp;
    if(effect==='transfer')effect=null;
    notice=oldPlace===placeKey()||oldScene==='battle'&&game.s.scene==='town'?game.log.at(-1):null;
    if(effect==='upgrade'&&game.s.weapon+game.s.armor<=oldEquipment){clearEffect();effect=null;}
    if(effect==='heal'&&oldScene!=='battle'&&game.s.hp<=oldHp){$('effect').className='';effect=null;}
    if(effect)playEffect(effect);else if(game.s.hp<oldHp)playEffect('hit');
    if(oldScene!==game.s.scene)selection=0;
    // Persist victory immediately; the fading enemy is only a visual snapshot.
    save();
    if(sleep||transfer||oldPlace!==placeKey()){beginPlaceTransition(sleep,oldScene==='battle'&&game.s.scene==='town',transfer);conversation=null;portraitFade=null;}
    if(oldEnemy&&oldEnemy.hp<=0&&game.s.scene==='dungeon'){
      defeat={enemy:{...oldEnemy},start:performance.now(),duration:850,reduced:!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,oldLevel,cleared};render();return;
    }
    if(oldScene!=='battle'&&game.s.scene==='battle')beginEncounter();else render();
    showResult(oldLevel,cleared);
  }
  function finishDefeat(){const result=defeat;defeat=null;selection=0;render();showResult(result.oldLevel,result.cleared);}
  const moveButtons=[...document.querySelectorAll('[data-move]')];
  function lockMotion(locked){moveButtons.forEach(b=>b.disabled=locked);[...$('commands').children].forEach(b=>b.disabled=locked);$('commands').style.pointerEvents=locked?'none':'';$('menu').disabled=locked;$('map-toggle').disabled=locked;}
  function beginEncounter(){clearLevelUp();encounter={start:performance.now(),duration:1100,reduced:!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches};selection=0;render();}
  function finishMotion(){if(!motion)return;motion=null;selection=0;if(game.s.scene==='battle')beginEncounter();else{lockMotion(false);render();}}
  function navigate(name){
    if(title||placeTransition||motion||encounter||defeat||$('dialog').open||game.s.scene!=='dungeon')return;
    const turns={left:-1,right:1,around:2};if(name!=='forward'&&!(name in turns))return;
    const from={x:game.s.x,y:game.s.y,direction:game.s.direction};
    game.log=[];
    if(name==='forward'){if(!game.move()){save();render();return;}}else game.turn(turns[name]);
    // Store the destination immediately, but reveal encounters and new UI after arrival.
    save();
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){if(game.s.scene==='battle')beginEncounter();else render();return;}
    motion={from,to:{x:game.s.x,y:game.s.y},turn:turns[name]||0,start:performance.now(),duration:name==='around'?460:name==='forward'?280:260};
    lockMotion(true);draw();
  }
  moveButtons.forEach(b=>b.onclick=()=>navigate(b.dataset.move));
  function showWarp(){
    const targets=game.warpFloors();
    modal('転移の術',['MP1で、到達済みの階層へ移動します。地下1階は地上出口、その他は上り階段に到着します。'],[
      ...targets.map(f=>[`地下${W.floors[f].level}階`,()=>run(()=>game.warp(W.floors[f].id),'transfer'),false,`▲ ${W.floors[f].level===1?'地上出口':'上り階段'}へ · MP1 · 魔法の鉱石：${game.s.ores.includes(W.floors[f].oreId)?'取得済み':'未取得'}`]),
      ['戻る',showActions]
    ]);
  }
  function showActions(){
    if(title||placeTransition||motion||encounter||defeat||$('dialog').open||game.s.scene!=='dungeon')return;
    modal('アクション',[],[
      ['調べる',()=>run(()=>game.interact()),true,'足元の出口・階段・宝箱'],
      ['転移の術',showWarp,false,'MP1 · 到達済みの階層へ'],
      ['帰還の術',()=>run(()=>game.recall(),'transfer'),false,'MP3 · 街へ戻る'],
      ['治癒の術',()=>run(()=>game.heal(),'heal'),false,`MP3 · HP+${20+game.s.level*3}`],
      ['回復薬',()=>run(()=>game.potion()),false,`残り ${game.s.potions} 個 · HP+28`],
      ['閉じる']
    ]);
  }
  function commandList(){const s=game.s,town=game.town;if(conversation&&!conversation.shop)return [['話を終える','酒場の客を選ぶ',finishTalk,'modal']];if(conversation?.shop?.phase==='confirm')return [[['weapon','armor'].includes(conversation.shop.action)?'強化する':conversation.shop.action==='rest'?'宿泊する':'購入する','説明した条件で実行',confirmShop,'modal'],['やっぱりやめる','何も消費せずに戻る',finishTalk,'modal']];if(s.scene==='town'){
    const back=['街の広場へ戻る','別の行き先を選ぶ',()=>game.leave()];
    if(!s.facility)return [['酒場',town.facilities.tavern.name,()=>game.visit('tavern')],['武器屋',town.facilities.smith.name,()=>game.visit('smith')],['薬屋',town.facilities.pharmacy.name,()=>game.visit('pharmacy')],['宿屋',town.facilities.inn.name,()=>game.visit('inn')],['迷宮に入る',W.floors[W.entryFloor(s.town)].name,()=>game.enter()],['街を出る','行き先と交通費を確認',()=>game.visit('travel')],['回復薬を使う',`所持 ${s.potions}個 · HP+28`,()=>game.potion(),'heal'],['回復魔法を使う',`治癒の術 · MP3 · HP+${20+s.level*3}`,()=>game.heal(),'heal']];
    if(s.facility==='travel')return [...town.routes.map(r=>[W.townById[r.town].name,`交通費 ${r.cost}G${s.gold<r.cost?' · 金貨が足りません':''}`,()=>game.travel(r.town)]),back];
    const commands={
      tavern:town.facilities.tavern.guests.map(guest=>[guest.name+'と話す',guest.role,()=>talk(guest),'modal']),
      smith:[['武器を強化',`攻撃+6 · 鉱石1個と${game.upgradeCost(true)}G`,()=>shopOffer('weapon'),'modal'],['防具を強化',`防御+6 · 鉱石1個と${game.upgradeCost(false)}G`,()=>shopOffer('armor'),'modal']],
      pharmacy:[['回復薬を買う',`${town.potionCost}G · HPを28回復`,()=>shopOffer('buy'),'modal'],['回復薬を使う',`所持 ${s.potions}個`,useShopPotion,'modal']],
      inn:[['宿泊する',`${town.innCost}G · HP・MP全回復`,()=>shopOffer('rest'),'modal']],
    };return [...commands[s.facility],back];
  }
    if(s.scene==='dungeon'&&!defeat)return [['アクション','行動を選ぶ',showActions,'modal']];
    return [['攻撃','武器で攻撃',()=>game.act(0),'hit'],['火炎の術','MP4',()=>game.act(1),'fire'],['治癒の術','MP3',()=>game.act(2),'heal'],['回復薬',`残り ${s.potions} 個`,()=>game.act(3),'heal'],['防御','被害を軽減 / MP+2',()=>game.act(4)],['逃走','迷宮へ逃げる',()=>game.act(5)]];
  }
  function render(){
    syncImages();
    $('app').dataset.scene=title?'title':game.s.scene;
    $('app').dataset.town=String(game.s.town);
    $('controls').className=game.s.scene==='dungeon'&&!defeat?'controls exploration-controls':'controls';
    $('title-screen').hidden=!title;$('play').hidden=title;$('menu').hidden=title;$('edition').hidden=!title;
    if(title){clearEffect();messageKeys.delete($('journal'));drawTitle();return;}const s=game.s;
    if($('effect').className==='upgrade'&&(s.facility!=='smith'||!conversation))clearEffect();
    $('region').textContent=game.town.region;$('location').textContent=s.scene==='town'?(s.facility==='travel'?'街の外へ':s.facility?game.town.facilities[s.facility].name:game.town.name):W.floors[s.floor].name;$('floor-badge').textContent=s.scene==='town'?'TOWN':`B${W.floors[s.floor].level}F`;
    $('level').textContent=s.level;$('gold').textContent=s.gold.toLocaleString();$('hp-label').textContent=`HP ${s.hp} / ${game.maxHp}`;$('mp-label').textContent=`MP ${s.mp} / ${game.maxMp}`;$('hp-bar').style.width=`${s.hp/game.maxHp*100}%`;$('mp-bar').style.width=`${s.mp/game.maxMp*100}%`;$('xp').textContent=`EXP ${s.xp} / ${game.nextXp}`;
    $('equipment').textContent=`武器 +${s.weapon}　鎧 +${s.armor}　薬 ${s.potions}　鉱石 ${s.ore}${s.oreBag.length?`（運搬中 ${s.oreBag.length}）`:""}　｜ 攻 ${game.power} / 防 ${game.defense}`;$('position').textContent=s.scene==='town'?(s.cleared?'✦ 冒険達成':'旅の支度'): `${['北','東','南','西'][s.direction]}向き · ${s.x}, ${s.y}`;
    $('view-caption').textContent=s.scene==='town'?(s.facility==='travel'?'交通費を確認し、次の街を選ぼう。':s.facility?game.town.facilities[s.facility].info[0]:'施設で旅の支度を整えるか、迷宮に入ろう。'):s.scene==='battle'?'一対一の戦い。次の一手を選ぼう。':({'E':'足元：▲ 地上への出口 ─ 調べると街へ','>':`足元：▼ 下り階段 ─ 調べるとB${W.floors[s.floor].level+1}Fへ`,'<':`足元：▲ 上り階段 ─ 調べるとB${W.floors[s.floor].level-1}Fへ`,'O':s.ores.includes(W.floors[s.floor].oreId)?'足元：採掘済みの鉱石':'足元：魔法の鉱石 ─ 調べて回収','C':'足元：宝箱 ─ 調べて開く','B':s.bosses.includes(W.bossKey(s.floor))?'守護者の間 ─ 静寂が戻った':W.enemyById[W.floors[s.floor].bossEnemy]?.finalBoss?'最終祭壇 ─ 灰の霧の元凶が待つ':'守護者の間'}[game.tileAt(s.x,s.y)]||'石壁の向こうへ、一歩ずつ。');
    $('map-toggle').hidden=s.scene==='town'||!!defeat;$('map').hidden=s.scene==='town'||!!defeat||!mapOpen;$('movement').hidden=s.scene!=='dungeon'||!!defeat;$('enemy-info').hidden=s.scene!=='battle'||!!encounter;$('encounter-banner').hidden=!encounter;if(s.enemy){$('enemy-name').textContent=(W.enemyById[s.enemy.kind].finalBoss?'◆ 最終決戦 · ':s.enemy.boss?'◆ 守護者 · ':'')+W.names[s.enemy.kind];$('encounter-name').textContent=(W.enemyById[s.enemy.kind].finalBoss?'最終決戦 · ':s.enemy.boss?'守護者 · ':'')+W.names[s.enemy.kind];$('enemy-hp').style.width=`${s.enemy.hp/W.health[s.enemy.kind]*100}%`;}
    updateMapToggleLabel();
    $('view-caption').hidden=s.scene==='town';
    const presence=$('enemy-presence');
    presence.hidden=s.scene!=='dungeon'||!!defeat;
    if(!presence.hidden){
      const rate=game.encounterRate;
      const intensity=rate<=W.MIN_ENCOUNTER_PERCENT/100?'low':
        rate<=MODERATE_ENCOUNTER_PERCENT/100?'moderate':'high';
      presence.dataset.intensity=intensity;
      presence.textContent=presenceLabels[intensity];
    }
    $('view').setAttribute('aria-label',conversation?game.town.facilities[s.facility].name+'を背景にした'+conversation.name+'の腰から上の立ち絵':'街・迷宮・敵の様子');
    let lines=s.scene==='town'?['施設で旅の支度を整えるか、迷宮に入ろう。']:[...game.log];
    if(s.scene==='town'&&s.facility){
      const info=s.facility==='travel'?['目的地を選ぶと交通費を支払って移動します。金貨が足りない場合は移動できません。']:game.town.facilities[s.facility].info;
      lines=[...info];
    }
    if(s.scene==='town'&&notice)lines=[notice];
    if(conversation)lines=[conversation.name+' · '+conversation.role,...conversation.dialogue];
    $('journal').dataset.conversation=conversation?'true':'false';
    messageLines($('journal'),lines,`${placeKey()}:${conversation?.id||''}`);
    const focusedCommand=document.activeElement?.dataset?.command;
    actions=commandList();$('commands').replaceChildren();actions.forEach(([label,sub,fn,effect],i)=>{const b=document.createElement('button');b.dataset.command=String(i);numberButton(b,i);b.textContent=label;const span=document.createElement('span');span.textContent=sub;b.append(span);b.onclick=()=>{if(placeTransition||portraitFade?.to===0)return;effect==='modal'?fn():run(fn,effect);};$('commands').append(b);});
    if(focusedCommand!==undefined)$('commands').children[Math.min(Number(focusedCommand),actions.length-1)]?.focus({preventScroll:true});
    $('keyboard-note').textContent=s.scene==='dungeon'?'1：アクション　W/↑：前進　A/D：旋回　S/↓：振り返る':encounter?'敵と遭遇 ─ 構える…':'1〜9：表示順に選択 · 行動ごとに自動保存';if(encounter)$('view-caption').textContent='敵の気配…次の一手に備えよう。';if(defeat){$('view-caption').textContent=W.names[defeat.enemy.kind]+' を倒した！';$('keyboard-note').textContent='敵を撃破 ─ 余韻が消えるのを待とう。';}lockMotion(!!placeTransition||!!encounter||!!defeat||portraitFade?.to===0);draw();drawMap();
  }
  // Fit the complete background, preserving its aspect ratio without clipping.
  function drawScenery(c,w,h,scenery){
    c.fillStyle=scenery?.ready?'#080e0c':'#000';
    c.fillRect(0,0,w,h);
    if(!scenery?.ready)return false;
    const img=scenery.img,scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
    c.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,(w-dw)/2,(h-dh)/2,dw,dh);
    return true;
  }
  function drawGuest(){
    const asset=conversation&&images.get(conversation.image);if(!asset?.ready)return;
    // The transparent 480×720 portraits end at the waist and scale with the scenery.
    const img=asset.img,sh=img.naturalHeight*2/3,dh=380,dw=img.naturalWidth*dh/sh;
    // Start only once the image is ready, so slow loading cannot consume the fade.
    if(portraitFade?.start===null)portraitFade.start=performance.now();
    ctx.save();ctx.globalAlpha=portraitOpacity();
    ctx.drawImage(img,0,0,img.naturalWidth,sh,(720-dw)/2,400-dh,dw,dh);ctx.restore();
  }
  function polygon(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  function drawTown(){
    const facility=game.s.facility;
    const path=facility==='travel'?game.town.travelImage:facility?game.town.facilities[facility]?.image:game.town.image;
    drawScenery(ctx,720,400,images.get(path));
  }
  function drawTitle(){
    $('title-screen').dataset.sceneryReady=String(drawScenery(titleCtx,960,580,images.get(titleImage)));
  }
  // 描画視点だけを進行方向の一歩手前に置く。移動・地図・イベントは現在地のまま。
  // 背後が壁の場合も仮想視点を置けるよう、レイは視点自身のマスを判定せず進める。
  function camera(){
    const s=game.s;if(!motion)return {x:s.x,y:s.y,dx:W.dx[s.direction],dy:W.dy[s.direction]};
    const t=Math.min(1,Math.max(0,(frame-motion.start)/motion.duration)),ease=t*t*(3-2*t);
    const angle=(motion.from.direction+motion.turn*ease)*Math.PI/2;
    return {x:motion.from.x+(motion.to.x-motion.from.x)*ease,y:motion.from.y+(motion.to.y-motion.from.y)*ease,
      dx:motion.turn&&t>0?Math.sin(angle):W.dx[motion.from.direction],dy:motion.turn&&t>0?-Math.cos(angle):W.dy[motion.from.direction]};
  }
  function dungeon(){const s=game.s,w=720,h=400,half=h/2,pose=camera(),dX=pose.dx,dY=pose.dy,px=pose.x+.5-dX,py=pose.y+.5-dY;
    const texture=images.get(W.floors[s.floor].wallTexture),wallTexture=texture?.img,wallReady=texture?.ready;
    // 模様を固定表示せず、床も天井も地平線に向かって暗くなる面として描く。
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#111b18');sky.addColorStop(.5,'#050c0a');sky.addColorStop(1,'#55533a');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    // 後方の仮想カメラが旋回すると壁内を通るため、現在地より背後の壁面を除外する。
    // 各レイの前向き成分は1なので、距離1が冒険者を通るクリップ平面になる。
    const nearClip=motion?.turn?1:0;
    const depths=[];
    for(let col=0;col<w;col+=2){const cam=2*col/w-1,rx=dX-dY*.66*cam,ry=dY+dX*.66*cam;let mx=Math.floor(px),my=Math.floor(py);const ddx=rx===0?Infinity:Math.abs(1/rx),ddy=ry===0?Infinity:Math.abs(1/ry),sx=rx<0?-1:1,sy=ry<0?-1:1;let tx=(rx<0?px-mx:mx+1-px)*ddx,ty=(ry<0?py-my:my+1-py)*ddy,side=false;
      // クリップ面が壁の内部を横切る列は断面で塞ぎ、壁の向こうへのレイ探索を止める。
      const capped=nearClip>0&&W.tile(s.floor,Math.floor(px+nearClip*rx),Math.floor(py+nearClip*ry))==='#';
      if(!capped)for(let n=0;n<64;n++){if(tx<ty){tx+=ddx;mx+=sx;side=false;}else{ty+=ddy;my+=sy;side=true;}if(W.tile(s.floor,mx,my)==='#'&&(side?ty-ddy:tx-ddx)>=nearClip)break;}
      const dist=capped?nearClip:Math.max(.05,side?ty-ddy:tx-ddx);depths[col/2]=dist;const height=h/dist,top=(h-height)/2,hit=capped?pose.x*(-dY)+pose.y*dX+.66*cam:side?px+dist*rx:py+dist*ry,u=hit-Math.floor(hit),shade=Math.max(.1,1/(1+dist*.3))*(capped?.65:side?.73:1),mortar=u<.015||u>.985?-22:0;
      const drawTop=Math.max(0,top),drawHeight=Math.min(h,top+height)-drawTop;
      if(wallReady){
        // A vertical texture strip follows the wall hit point; clip UVs when the wall fills the view.
        const textureU=(!side&&rx>0||side&&ry<0)?1-u:u;
        const sx=Math.min(wallTexture.naturalWidth-1,Math.floor(textureU*wallTexture.naturalWidth));
        const sy=(drawTop-top)/height*wallTexture.naturalHeight,sh=drawHeight/height*wallTexture.naturalHeight;
        ctx.drawImage(wallTexture,sx,sy,1,sh,col,drawTop,2,drawHeight);
        ctx.fillStyle=`rgba(0,0,0,${1-shade})`;ctx.fillRect(col,drawTop,2,drawHeight);
      }else{
        ctx.fillStyle=`rgb(${Math.max(0,126*shade+mortar)},${Math.max(0,132*shade+mortar)},${Math.max(0,109*shade+mortar)})`;ctx.fillRect(col,drawTop,2,drawHeight);
      }
    }
    // Include events within three steps, including visible cells to either side.
    // Wall depths below reject occluded events; project from the moving camera.
    // Turns still hide bubbles so side events cannot drift across the view.
    const landmarks=[];
    if(!motion?.turn)for(let ox=-3;ox<=3;ox++)for(let oy=-3;oy<=3;oy++){
      if(Math.abs(ox)+Math.abs(oy)>3||ox*dX+oy*dY<0)continue;
      const x=s.x+ox,y=s.y+oy,t=game.tileAt(x,y);
      if(!'ECO<>B'.includes(t)||t==='C'&&s.chests.includes(W.key(s.floor,x,y))||t==='B'&&s.bosses.includes(W.bossKey(s.floor))||t==='O'&&s.ores.includes(W.floors[s.floor].oreId))continue;
      const distance=(x-pose.x)*dX+(y-pose.y)*dY;
      const lateral=-(x-pose.x)*dY+(y-pose.y)*dX;
      landmarks.push({t,z:distance+1,distance,lateral});
    }

    const shade=ctx.createRadialGradient(w/2,h/2,20,w/2,h/2,w*.63);shade.addColorStop(0,'transparent');shade.addColorStop(1,'#020a08c9');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
    // Battle and defeat presentations keep the dungeon background free of event bubbles.
    if(s.scene==='battle'||defeat)return;
    // Keep the bubble above the caption, including when a short screen crops the Canvas.
    const view=$('view'),displayHeight=view.clientHeight||h,scale=Math.max((view.clientWidth||w)/w,displayHeight/h),cropY=(h*scale-displayHeight)/2,markerY=Math.min(h-55,(displayHeight+cropY-40)/scale);
    landmarks.sort((a,b)=>b.z-a.z).forEach(({t,z,distance,lateral})=>{const x=w/2*(1+lateral/(z*.66)),y=Math.min(markerY,half+h/(2*z));if(x<0||x>=w||depths[Math.floor(x/2)]<z-.2)return;drawLandmark(t,x,y,distance);});
  }
  function drawLandmark(tile,x,y,distance){
    const label={E:'▲ 地上出口',C:'宝箱',O:'魔法の鉱石','>':'▼ 下り階段','<':'▲ 上り階段',B:W.enemyById[W.floors[game.s.floor].bossEnemy]?.finalBoss?'最終祭壇':'守護者'}[tile];
    // Scale the entire bubble by distance from the player, rather than the rear camera.
    const size=.85/(1+.7*distance),fontSize=30*size,width=(30*(label.length-(label.includes(' ')?1:0))+28)*size,height=54*size,radius=12*size;
    const cx=Math.max(width/2+8,Math.min(720-width/2-8,x)),left=cx-width/2,right=cx+width/2,bottom=y-14*size,top=bottom-height,tail=Math.max(left+20*size,Math.min(right-20*size,x));
    ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,4-distance));ctx.fillStyle=tile==='B'?'#e8b399':tile==='C'?'#e5cb8f':tile==='O'?'#83d79b':tile==='>'?'#c7a0ef':'#b9d5c2';ctx.shadowColor='#000b';ctx.shadowBlur=12*size;ctx.shadowOffsetY=4*size;
    // A rounded speech bubble points to the event's projected position on the floor.
    ctx.beginPath();ctx.moveTo(left+radius,top);ctx.lineTo(right-radius,top);ctx.quadraticCurveTo(right,top,right,top+radius);ctx.lineTo(right,bottom-radius);ctx.quadraticCurveTo(right,bottom,right-radius,bottom);
    ctx.lineTo(tail+9*size,bottom);ctx.lineTo(x,y);ctx.lineTo(tail-9*size,bottom);ctx.lineTo(left+radius,bottom);ctx.quadraticCurveTo(left,bottom,left,bottom-radius);ctx.lineTo(left,top+radius);ctx.quadraticCurveTo(left,top,left+radius,top);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#14241d';ctx.font=`bold ${fontSize}px "Yu Gothic",Meiryo,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,cx,top+height/2+1);ctx.restore();
  }
  function draw(){
    if(title)return;const s=game.s;ctx.clearRect(0,0,720,400);
    const elapsed=placeTransition?performance.now()-placeTransition.start:0;
    if(placeTransition?.death){
      const {snapshot,red,black,blank,hold}=placeTransition;
      if(elapsed<red){ctx.drawImage(snapshot,0,0,720,400);const t=elapsed/red;shadePlace(t*t*(3-2*t),'#8b0000');return;}
      if(elapsed<red+black){shadePlace(1,'#8b0000');const t=(elapsed-red)/black;shadePlace(t*t*(3-2*t),'#000000');return;}
      if(elapsed<red+black+blank+hold){
        shadePlace(1,'#000000');
        if(elapsed>=red+black+blank){ctx.save();ctx.fillStyle='#ede3cc';ctx.font='26px "Yu Mincho",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('あなたは死にました...',360,180);ctx.font='18px "Yu Mincho",serif';ctx.fillStyle='#9b958a';ctx.fillText('所持金を半分失った...',360,220);ctx.restore();}
        return;
      }
    }
    if(placeTransition?.sleep){
      const {snapshot,out,hold}=placeTransition;
      if(elapsed<out){ctx.drawImage(snapshot,0,0,720,400);const t=elapsed/out;shadePlace(t*t*(3-2*t));return;}
      if(elapsed<out+hold){shadePlace(1);ctx.save();ctx.fillStyle='#ede3cc';ctx.font='20px \"Yu Mincho\",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('ぐっすり眠った……',360,200);ctx.restore();return;}
    }
    const fade=placeTransition?Math.max(0,Math.min(1,(performance.now()-placeTransition.start)/placeTransition.duration)):1;
    if(placeTransition&&!placeTransition.sleep&&!placeTransition.death&&fade<.5){
      ctx.drawImage(placeTransition.snapshot,0,0,720,400);
      const t=fade*2;shadePlace(t*t*(3-2*t),placeTransition.transfer?'#ffffff':'#080e0c');return;
    }
    if(s.scene==='town'){drawTown();drawGuest();}else dungeon();
    if(!motion&&(defeat||s.scene==='battle'&&s.enemy)){
      const e=defeat?defeat.enemy:s.enemy,sp=images.get(W.enemyById[e.kind].image);
      const reveal=encounter&&!encounter.reduced?Math.max(0,Math.min(1,(frame-encounter.start-180)/650)):1,ease=reveal*reveal*(3-2*reveal);
      const fall=defeat?(defeat.reduced?1:Math.max(0,Math.min(1,(frame-defeat.start-120)/650))):0,fade=fall*fall*(3-2*fall),opacity=defeat?1-fade:ease;
      ctx.fillStyle=`rgba(5,11,8,${defeat ? .67*opacity : .67+.12*(1-ease)})`;ctx.fillRect(0,0,720,400);
      ctx.save();ctx.globalAlpha=opacity;
      ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(360,346,100,12,0,0,Math.PI*2);ctx.fill();
      if(sp?.ready){
        const [x,y,w,h]=sp.crop||[0,0,sp.img.naturalWidth,sp.img.naturalHeight];
        const fit=Math.min((e.boss?360:310)/w,268/h)*(defeat?1-.14*fade:.88+.12*ease),breathe=defeat?24*fade:encounter?20*(1-ease):Math.sin(frame/700)*3;
        ctx.drawImage(sp.img,x,y,w,h,360-w*fit/2,350-h*fit+breathe,w*fit,h*fit);
      }else{
        ctx.fillStyle='#b6ab84';ctx.font='70px Georgia';ctx.textAlign='center';ctx.fillText('◆',360,270);ctx.font='16px sans-serif';ctx.fillText(W.names[e.kind],360,310);
      }
      ctx.restore();
    }
    if(placeTransition){const t=placeTransition.death?Math.max(0,Math.min(1,(elapsed-placeTransition.red-placeTransition.black-placeTransition.blank-placeTransition.hold)/placeTransition.into)):placeTransition.sleep?Math.max(0,Math.min(1,(elapsed-placeTransition.out-placeTransition.hold)/placeTransition.into)):(fade-.5)*2;shadePlace(1-t*t*(3-2*t),placeTransition.death?'#000000':placeTransition.transfer?'#ffffff':'#080e0c');}
  }
  function drawMap(){
    const s=game.s,c=mapCtx,seen=new Set(s.explored),{width,height}=W.dimensions[s.floor];
    const left=Math.max(0,Math.min(width-13,s.x-6)),top=Math.max(0,Math.min(height-11,s.y-5));
    c.clearRect(0,0,182,154);
    for(let y=top;y<Math.min(height,top+11);y++)for(let x=left;x<Math.min(width,left+13);x++){
      if(!seen.has(W.key(s.floor,x,y)))continue;
      const t=game.tileAt(x,y),px=(x-left)*14,py=(y-top)*14;
      c.fillStyle=t==='#'?'#58634d':'#1e3529';c.fillRect(px,py,13,13);
      if('ECO<>B'.includes(t)){
        const used=t==='O'&&s.ores.includes(W.floors[s.floor].oreId)||t==='C'&&s.chests.includes(W.key(s.floor,x,y))||t==='B'&&s.bosses.includes(W.bossKey(s.floor));
        if(used)continue;c.fillStyle=t==='B'?'#d19476':'#d8c688';c.textAlign='center';c.font='10px monospace';
        c.fillText(({E:'▲',C:'宝',O:'鉱',B:'敵','>':'▼','<':'▲'})[t],px+7,py+11);
      }
    }
    const x=(s.x-left)*14+7,y=(s.y-top)*14+7,dX=W.dx[s.direction],dY=W.dy[s.direction];
    polygon(c,[[x+dX*7,y+dY*7],[x-dX*5-dY*5,y-dY*5+dX*5],[x-dX*5+dY*5,y-dY*5-dX*5]],'#f4dfa1');
  }
  // Battle presentations finish after their fixed duration, regardless of input.
  document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(e.altKey||e.ctrlKey||e.metaKey)return;if(encounter||defeat){e.preventDefault();return;}if(e.repeat)return;if($('dialog').open){chooseNumber(e,[...$('dialog-buttons').children]);return;}if(placeTransition||motion||portraitFade?.to===0){if(actionKeyNames.has(k)||k==='escape'||k==='f5'||k==='f9')e.preventDefault();return;}if(title){chooseNumber(e,[$('continue'),$('start')].filter(b=>!b.hidden));return;}if(k==='escape'){e.preventDefault();if(conversation){if(conversation.shop?.phase==='result')run(()=>game.leave());else finishTalk();return;}if(game.s.scene==='town'&&game.s.facility)run(()=>game.leave());else showMenu();return;}if(k==='f5'){e.preventDefault();save(true);return;}if(k==='f9'){e.preventDefault();modal('記録の読込',['保存された旅の記録を読み込みます。'],[['読み込む',load,true],['やめる']]);return;}const s=game.s;
    if(debugEnvironment&&(k==='0'||e.code==='Numpad0')&&s.scene==='town'&&s.facility===null&&!conversation){e.preventDefault();run(()=>{s.gold=1000000;s.level=99;s.ore=99;s.reachedFloors=W.floors.map(f=>f.id);});return;}
    if(s.scene==='dungeon'){if(k==='9'){e.preventDefault();$('map-toggle').onclick();return;}const m={w:'forward',arrowup:'forward',s:'around',arrowdown:'around',a:'left',arrowleft:'left',d:'right',arrowright:'right'};if(m[k]){e.preventDefault();navigate(m[k]);return;}const f={e:()=>game.interact(),r:()=>game.recall(),p:()=>game.potion()};if(f[k]){e.preventDefault();run(f[k],k==='r'?'transfer':null);return;}}
    if(chooseNumber(e,[...$('commands').children]))return;
    if((s.scene==='town'||s.scene==='battle')&&(k==='arrowup'||k==='arrowdown')){e.preventDefault();selection=(selection+(k==='arrowup'?-1:1)+actions.length)%actions.length;$('commands').children[selection].focus();}
  });
  $('dialog').addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearLevelUp();finishPlaceTransition();finishMotion();if(portraitFade?.to===0)closeTalk();else if(portraitFade){portraitFade=null;draw();}save();}else if(encounter||defeat){(encounter||defeat).start=performance.now();}});window.addEventListener('pagehide',()=>{clearLevelUp();save();});
  function animate(t){
    frame=t;
    revealMessages(t);
    if(levelUpUntil&&t>=levelUpUntil)clearLevelUp();
    if(!document.hidden&&!title){
      if(placeTransition){if(t-placeTransition.start>=placeTransition.duration)finishPlaceTransition();else draw();}
      else if(portraitFade){
        if(portraitFade.start!==null){
          if(t-portraitFade.start>=portraitFade.duration){if(portraitFade.to===0)closeTalk();else{portraitFade=null;draw();}}
          else draw();
        }
      }
      else if(motion&&t-motion.start>=motion.duration)finishMotion();
      else if(encounter){
        if(t-encounter.start>=encounter.duration){encounter=null;render();}
        else draw();
      }else if(defeat){
        if(t-defeat.start>=defeat.duration)finishDefeat();
        else draw();
      }else if(motion||game.s.scene==='battle')draw();
    }
    requestAnimationFrame(animate);
  }
  syncTitle();render();requestAnimationFrame(animate);
})();
