'use strict';
// IDs are permanent save identifiers. Do not reuse a retired ID.
const BrowsardryTowns = [
  {
    "id": 0,
    "name": "辺境の街 リンド",
    "region": "LYND · THE BORDER TOWN",
    "image": "./assets/scenery/lynd.png",
    "travelImage": "./assets/scenery/travel.png",
    "innCost": 12,
    "potionCost": 18,
    "routes": [
      {
        "town": 1,
        "cost": 20
      },
      {
        "town": 2,
        "cost": 35
      }
    ],
    "facilities": {
      "tavern": {
        "image": "./assets/scenery/tavern.png",
        "name": "酒場「灰の灯」",
        "guests": [
          {
            "id": "lynd-garrick", "name": "ガリック", "role": "辺境の老狩人",
            "image": "./assets/characters/lynd-garrick.png",
            "dialogue": ["この辺りの森は、若い頃から歩いてきた。だが灰の霧が出てからは、獣さえ街道へ逃げてくる。", "霧は灰の地下墓地から流れてくるんだ。地下7階の墓守の騎士を倒せば、この街にも静かな夜が戻るだろう。"]
          },
          {
            "id": "lynd-lina", "name": "リナ", "role": "森の薬草摘み",
            "image": "./assets/characters/lynd-lina.png",
            "dialogue": ["お帰りなさい、と言える相手が増えると嬉しいの。迷宮へ行くなら、薬の用意を忘れないでね。", "回復薬はHPを28回復するわ。帰還の術のためにMPを3残して、危なくなったら街へ戻ってきて。宿で休めばHPもMPも全回復よ。"]
          },
          {
            "id": "lynd-noel", "name": "ノエル", "role": "旅の吟遊詩人",
            "image": "./assets/characters/lynd-noel.png",
            "dialogue": ["旅の歌には、三つの街と三人の守護者が出てくる。今は歌の結末を書き直してくれる人を探しているんだ。", "赤い王旗の都ミレア、その先には巡礼者の集う聖都ヴァルド。各地の守護者を倒して平穏を取り戻す、それが君の旅の目的になるだろう。"]
          }
        ],
        "info": [
          "暖炉の火が揺れる酒場だ。客に話しかけてみよう。"
        ]
      },
      "smith": {
        "image": "./assets/scenery/smith.png",
        "name": "武器屋「鉄の枝」",
        "owner": {
          "id": "lynd-smith",
          "name": "バルト",
          "role": "武器屋の主人",
          "image": "./assets/characters/lynd-smith.png",
          "offers": {
            "weapon": [
              "武器を1段階強化するよ。費用は{cost}だ。",
              "効果は{effect}。強化するかい？"
            ],
            "armor": [
              "防具を1段階強化するよ。費用は{cost}だ。",
              "効果は{effect}。強化するかい？"
            ]
          }
        },
        "info": [
          "持ち帰った魔法の鉱石1個で、武器か防具を1段階強化する。加工代は強化する装備の段階に応じて上がる。"
        ]
      },
      "pharmacy": {
        "image": "./assets/scenery/pharmacy.png",
        "name": "薬屋「白葉堂」",
        "owner": {
          "id": "lynd-pharmacist",
          "name": "エマ",
          "role": "薬屋の主人",
          "image": "./assets/characters/lynd-pharmacist.png",
          "offers": {
            "buy": [
              "回復薬は1個{cost}だよ。使うとHPが28回復する。",
              "今は{count}個持っているね。1個買うかい？"
            ]
          }
        },
        "info": [
          "回復薬はHPを28回復する。探索と戦闘の両方で使える。"
        ]
      },
      "inn": {
        "image": "./assets/scenery/inn.png",
        "name": "宿屋「旅鳥の羽」",
        "owner": {
          "id": "lynd-innkeeper",
          "name": "ハンス",
          "role": "宿屋の主人",
          "image": "./assets/characters/lynd-innkeeper.png",
          "offers": {
            "rest": [
              "一泊{cost}だよ。ゆっくり休めばHPとMPが全回復する。",
              "今夜は泊まっていくかい？"
            ]
          }
        },
        "info": [
          "一晩休めばHPとMPが全回復する。"
        ]
      }
    }
  },
  {
    "id": 1,
    "name": "王都 ミレア",
    "region": "MIREA · THE ROYAL CAPITAL",
    "image": "./assets/scenery/mirea-square.png",
    "travelImage": "./assets/scenery/mirea-travel.png",
    "innCost": 16,
    "potionCost": 18,
    "routes": [
      {
        "town": 0,
        "cost": 20
      },
      {
        "town": 2,
        "cost": 30
      }
    ],
    "facilities": {
      "tavern": {
        "image": "./assets/scenery/mirea-tavern.png",
        "name": "酒場「紅獅子亭」",
        "guests": [
          {
            "id": "mirea-reinhard", "name": "ラインハルト", "role": "非番の近衛兵",
            "image": "./assets/characters/mirea-reinhard.png",
            "dialogue": ["赤い王旗の下で国を守る。それが俺たちの誇りだった。まさか王宮の地下で、仲間のいない鎧が歩き出すとはな。", "王宮地下封庫は地下5階だ。浅い階の魔猟犬と空ろな近衛を越えた先には、宮廷の亡霊まで出る。最深部の誓約の摂政を止めてくれ。"]
          },
          {
            "id": "mirea-serena", "name": "セレナ", "role": "王宮の記録官",
            "image": "./assets/characters/mirea-serena.png",
            "dialogue": ["古い記録には、王都と辺境の守護者が聖都の封印を支えたとあります。その誓約が、灰の霧で歪められているのです。", "リンドの墓守の騎士と、ここの誓約の摂政。両者を倒さなければ、ヴァルドの最後の封印は開きません。遠回りに見えても、二つの迷宮を訪ねてください。"]
          },
          {
            "id": "mirea-bruno", "name": "ブルーノ", "role": "街道の交易商",
            "image": "./assets/characters/mirea-bruno.png",
            "dialogue": ["ここミレアは、リンドを含む領地を治める王国の中心だ。城塞宮殿と軍務庁の注文だけでも、荷馬車がいくらあっても足りんよ。", "街道を行くなら財布も確認しな。ここからリンドへは20G、聖都ヴァルドへは30Gだ。迷宮の鉱石を持ち帰れば、武器屋で鉱石と加工代を渡して装備を強化できるぞ。"]
          }
        ],
        "info": [
          "兵士や旅人が集う酒場だ。客に話しかけてみよう。"
        ]
      },
      "smith": {
        "image": "./assets/scenery/mirea-smith.png",
        "name": "王室御用武器店「赤獅子の武具庫」",
        "owner": {
          "id": "mirea-smith",
          "name": "アルベルト",
          "role": "王都の武具職人",
          "image": "./assets/characters/mirea-smith.png",
          "offers": {
            "weapon": [
              "武器を1段階強化するよ。費用は{cost}だ。",
              "効果は{effect}。強化するかい？"
            ],
            "armor": [
              "防具を1段階強化するよ。費用は{cost}だ。",
              "効果は{effect}。強化するかい？"
            ]
          }
        },
        "info": [
          "近衛と城塞守備隊の武具を鍛える工房だ。持ち帰った魔法の鉱石1個で武器か防具を1段階強化する。加工代は強化する装備の段階に応じて上がる。"
        ]
      },
      "pharmacy": {
        "image": "./assets/scenery/mirea-pharmacy.png",
        "name": "王都薬房「琥珀の天秤」",
        "owner": {
          "id": "mirea-pharmacist",
          "name": "クラリス",
          "role": "王都の薬師",
          "image": "./assets/characters/mirea-pharmacist.png",
          "offers": {
            "buy": [
              "回復薬は1個{cost}だよ。使うとHPが28回復する。",
              "今は{count}個持っているね。1個買うかい？"
            ]
          }
        },
        "info": [
          "王宮地下には空ろな近衛や宮廷の亡霊が出る。回復薬はHPを28回復する。帰還用のMPも残しておこう。"
        ]
      },
      "inn": {
        "image": "./assets/scenery/mirea-inn.png",
        "name": "宿屋「王冠の窓」",
        "owner": {
          "id": "mirea-innkeeper",
          "name": "エレナ",
          "role": "王都の宿の女主人",
          "image": "./assets/characters/mirea-innkeeper.png",
          "offers": {
            "rest": [
              "一泊{cost}だよ。ゆっくり休めばHPとMPが全回復する。",
              "今夜は泊まっていくかい？"
            ]
          }
        },
        "info": [
          "王都を巡る使者も休む宿だ。宿泊すればHPとMPが全回復する。"
        ]
      }
    }
  },
  {
    "id": 2,
    "name": "聖都 ヴァルド",
    "region": "VALD · THE SACRED CITY",
    "image": "./assets/scenery/vald-square.png",
    "travelImage": "./assets/scenery/vald-travel.png",
    "innCost": 20,
    "potionCost": 20,
    "routes": [
      {
        "town": 0,
        "cost": 35
      },
      {
        "town": 1,
        "cost": 30
      }
    ],
    "facilities": {
      "tavern": {
        "image": "./assets/scenery/vald-tavern.png",
        "name": "巡礼酒場「七つの灯」",
        "guests": [
          {
            "id": "vald-elise", "name": "エリーゼ", "role": "異国の巡礼者",
            "image": "./assets/characters/vald-elise.png",
            "dialogue": ["幾つもの国を越えて、この大聖堂まで来ました。白い回廊に朝の鐘が響く瞬間だけは、道中の不安も忘れられます。", "ヴァルドは王都ほど大きくありません。でも、祈りを携えた旅人を迎えて育った街なのです。どうか、この灯を消さないでください。"]
          },
          {
            "id": "vald-oswald", "name": "オズワルド", "role": "引退した封印守",
            "image": "./assets/characters/vald-oswald.png",
            "dialogue": ["灰の霧の源は、大聖堂の下に眠る封印聖廟じゃ。地下9階の灰の祭司王が、古い祈りを呪いへ変えておる。", "リンドの墓守の騎士、王都の誓約の摂政。その二つを倒せば最後の封印は解ける。準備が済んだら最深部の祭壇を調べ、霧の元凶と向き合うのじゃ。"]
          },
          {
            "id": "vald-marta", "name": "マルタ", "role": "巡礼路の療養師",
            "image": "./assets/characters/vald-marta.png",
            "dialogue": ["聖廟から戻った人を、ずいぶん手当てしてきたよ。灰の香炉、堕ちた巡礼者、砕翼の聖像……祈りの場所が、今は危険でいっぱいさ。", "各階の魔法の鉱石を持ち帰って、武器も防具も整えなさい。戦いで防御すればMPが2戻る。帰る力まで使い切らないこと、それが私との約束だよ。"]
          }
        ],
        "info": [
          "巡礼者たちがひと息つく酒場だ。客に話しかけてみよう。"
        ]
      },
      "smith": {
        "image": "./assets/scenery/vald-smith.png",
        "name": "聖具武器店「銀星の鍛冶場」",
        "owner": {
          "id": "vald-smith",
          "name": "ダリオ",
          "role": "聖都の鍛冶師",
          "image": "./assets/characters/vald-smith.png",
          "offers": {
            "weapon": [
              "武器を1段階強化するよ。費用は{cost}だ。",
              "効果は{effect}。強化するかい？"
            ],
            "armor": [
              "防具を1段階強化するよ。費用は{cost}だ。",
              "効果は{effect}。強化するかい？"
            ]
          }
        },
        "info": [
          "巡礼者を守る刃を鍛える。魔法の鉱石1個で武器か防具を1段階強化する。加工代は装備の段階に応じて上がる。最終決戦の前に備えよう。"
        ]
      },
      "pharmacy": {
        "image": "./assets/scenery/vald-pharmacy.png",
        "name": "修道薬房「白庭の雫」",
        "owner": {
          "id": "vald-pharmacist",
          "name": "ベアトリス",
          "role": "修道薬房の薬師",
          "image": "./assets/characters/vald-pharmacist.png",
          "offers": {
            "buy": [
              "回復薬は1個{cost}だよ。使うとHPが28回復する。",
              "今は{count}個持っているね。1個買うかい？"
            ]
          }
        },
        "info": [
          "修道院の薬草園から届く回復薬だ。HPを28回復する。聖廟の奥では回復とMPの管理を忘れずに。"
        ]
      },
      "inn": {
        "image": "./assets/scenery/vald-inn.png",
        "name": "巡礼宿「静鐘の庵」",
        "owner": {
          "id": "vald-innkeeper",
          "name": "セドリック",
          "role": "巡礼宿の主人",
          "image": "./assets/characters/vald-innkeeper.png",
          "offers": {
            "rest": [
              "一泊{cost}だよ。ゆっくり休めばHPとMPが全回復する。",
              "今夜は泊まっていくかい？"
            ]
          }
        },
        "info": [
          "白い回廊に朝の鐘が響く。宿泊でHPとMPを全回復し、聖廟へ向かう支度を整えよう。"
        ]
      }
    }
  }
];
if(typeof module!=='undefined')module.exports=BrowsardryTowns;
