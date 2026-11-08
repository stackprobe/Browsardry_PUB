'use strict';
const W=require('../DocRoot/engine.js');
// Fixed progression checkpoints, not automatic level scaling. Equipment uses
// only the finite ore available by that point (7 / 12 / 21 upgrades).
const checkpoints=[
  [0,1,1,0,0],[0,4,7,2,1],[0,7,14,4,3],
  [1,1,15,4,3],[1,5,25,7,5],
  [2,1,26,7,5],[2,5,33,9,7],[2,9,40,11,10]
];
function simulate(enemy,checkpoint,seed){
  let random=seed;const g=new W.Adventure(()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;});
  const [town,depth,level,weapon,armor]=checkpoint;
  Object.assign(g.s,{town,floor:W.townFloors[town][depth-1],level,weapon,armor,scene:'battle',xp:0});
  [g.s.x,g.s.y]=W.findTile(g.s.floor,enemy.boss?'B':depth===1?'E':'<');
  g.s.hp=g.maxHp;g.s.mp=g.maxMp;g.s.enemy={kind:enemy.id,hp:enemy.health,boss:enemy.boss};
  let turns=0,heals=0,fire=0;
  while(g.s.scene==='battle'&&turns<200){
    const danger=Math.max(1,enemy.attack+3-g.defense),healing=20+level*3;
    let action=0;
    if(g.s.hp<=danger*2&&g.maxHp-g.s.hp>=healing&&g.s.mp>=3){action=2;heals++;}
    else if(g.s.enemy.hp>g.power+4&&g.s.mp>=4&&(g.s.enemy.hp<=18+level*4||g.s.mp>=10&&(enemy.boss||g.s.enemy.hp>g.power*2))){action=1;fire++;}
    g.act(action);turns++;
  }
  return {won:g.s.scene==='dungeon',turns,heals,fire,hp:g.s.hp/g.maxHp};
}
function report(){
  const rows=[];
  for(const checkpoint of checkpoints){
    const [town,depth,level,weapon,armor]=checkpoint,floor=W.floors[W.townFloors[town][depth-1]];
    const targets=[floor.encounterEnemies.at(-1),...(floor.bossEnemy===null?[]:[floor.bossEnemy])];
    for(const id of targets){
      const enemy=W.enemyById[id],runs=Array.from({length:100},(_,i)=>simulate(enemy,checkpoint,i+1));
      const avg=key=>+(runs.reduce((s,r)=>s+r[key],0)/runs.length).toFixed(1);
      rows.push({town,depth,level,weapon,armor,enemy:enemy.name,boss:enemy.boss,win:runs.filter(r=>r.won).length,turns:avg('turns'),heals:avg('heals'),fire:avg('fire'),hpPercent:Math.round(runs.reduce((s,r)=>s+r.hp,0))});
    }
  }
  return rows;
}
function economy(encountersPerFloor){
  const g=new W.Adventure();let income=g.s.gold,xp=0,level=1,smith=0;
  const floors=[...W.floors].sort((a,b)=>a.town-b.town||a.level-b.level);
  floors.forEach((f,i)=>{
    for(const id of f.encounterEnemies){const e=W.enemyById[id];income+=encountersPerFloor*e.gold/3;xp+=encountersPerFloor*e.experience/3;}
    income+=(f.rows.join('').split('C').length-1)*(55+(f.level-1)*45);
    if(f.bossEnemy!==null){const boss=W.enemyById[f.bossEnemy];income+=boss.gold;xp+=boss.experience;}
    while(xp>=level*45&&level<99){xp-=level*45;level++;}
    const weapon=i%2===0;smith+=g.upgradeCost(weapon);g.s[weapon?'weapon':'armor']++;
  });
  return {encountersPerFloor,level,income:Math.round(income),smith,remaining:Math.round(income-smith)};
}
if(require.main===module){console.table(report());console.table([20,30].map(economy));}
module.exports={checkpoints,simulate,report,economy};
