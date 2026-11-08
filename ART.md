# 画像素材の仕様

画像素材は組み込みImageGenで制作したPNGです。配信先は `DocRoot/assets/`、ゲーム内の画像参照は `DocRoot/data/` の各データで管理します。

## 配信サイズ

| 用途 | 保存先 | サイズ・形式 |
|---|---|---|
| タイトル背景 | `scenery/title.png` | 960×580、不透明PNG |
| 街・施設・街道 | `scenery/` | 720×400、不透明PNG |
| 壁テクスチャ | `textures/` | 512×512、不透明PNG |
| 酒場の客・施設の主人 | `characters/` | 480×720、透過PNG |
| 通常敵 | `enemies/` | 最大310×268、透過PNG |
| 守護者 | `enemies/` | 最大360×268、透過PNG |

- 縦横比を維持して配信サイズへ縮小します。背景は中央を切り出してサイズを合わせ、ゲーム内では全体を表示します。
- 敵はアルファ値5超の描画領域に2pxの余白を加えて切り出し、Lanczosで描画枠内へ縮小します。通常敵と守護者が画像を共有する場合は守護者の枠を基準にします。
- 人物立ち絵は上部2/3を腰までの表示範囲として使い、背景と同じ倍率で拡縮します。
- Canvasの内部解像度は720×400です。描画枠を変更した場合は素材サイズも見直してください。
- 配信画像の寸法・表示は `node verify.cjs` で検証します。

## 街・施設・街道

リンドは灰緑・オリーブ・古木と石、暖かな灯りの辺境の街です。背景は `lynd.png` と `{tavern,smith,pharmacy,inn,travel}.png` を使用します。

王都ミレアは赤い王旗・深紅の布、暗い花崗岩と赤褐色の石積み、厚い城壁と角塔を持つ政治・軍事の中枢です。聖都ヴァルドは白い石、青緑の布、糸杉、八芒星と大聖堂を持つ巡礼都市です。背景はそれぞれ `mirea-{square,tavern,smith,pharmacy,inn,travel}.png` と `vald-{square,tavern,smith,pharmacy,inn,travel}.png` を使用します。

王都の紋章は、翼を上向きに畳み、尾を内側に巻いた二脚のワイバーンを金縁の縦長の盾に収めます。布の幅45％・高さ50％以内を目安に、縁飾り・縫い目・裾から十分に離して配置します。画面端で切れる旗や狭い面は赤い無地とし、敷物は赤と金縁、クッションは無地を基準にします。

## 人物立ち絵

手描き風の中世ダークファンタジーで、膝上までの立ち姿と透過背景を基準にします。

- 酒場の客は各街3人、計9人。名前・肩書き・会話・画像参照は `towns.js` の `facilities.tavern.guests` に定義します。
- 武器屋・薬屋・宿屋の主人は各街1人ずつ。画像は `{lynd,mirea,vald}-{smith,pharmacist,innkeeper}.png`、名前・肩書き・確認の台詞は各施設の `owner` に定義します。
- 立ち絵の登場・終了には約0.32秒のフェードを使い、画像読込失敗時も文章と操作を継続します。施設ごとの動作は [README.md](README.md) を参照してください。

## 壁・敵

壁はリンドが `stone-wall.png`、王都が `royal-vault.png`、聖都が `sacred-seal.png` を使います。ゲーム側で距離・壁面方向による陰影を加えます。王都・聖都の意匠は [壁テクスチャのプロンプト](tools/dungeon-texture-prompts.md) を参照してください。

敵の能力・画像参照は `enemies.js`、階ごとの出現設定は `maps.js` に定義します。敵ID 20〜37の制作プロンプトは [敵立ち絵のプロンプト](tools/enemy-art-prompts.md) にあります。

## タイトル背景のプロンプト

> Use case: stylized-concept. Asset type: production background illustration for the title screen of Browsardry, a solitary first-person dungeon RPG. Create a wide landscape painting, aspect ratio about 16:10. View from inside the weathered stone archway of an ancient crypt looking out toward a small medieval frontier village at dusk. Rough gray-green masonry frames both sides, distant timber houses, a few warm amber lanterns, misty hills, ash-colored twilight sky. Rich detailed hand-painted dark fantasy game art, restrained olive green, charcoal, old gold, atmospheric depth and credible stone texture. Quiet sense of entering a dangerous forgotten labyrinth, no monsters or people. Composition: broad quiet dark central sky and mist area in the upper middle so a live game title can be overlaid legibly; scenery detail concentrated around edges and lower third. No text, no logo, no lettering, no UI, no borders, no watermark. Opaque full-bleed background.

## リンドの街背景のプロンプト

> Use case: stylized-concept. Asset type: production scenery background for the town scene in Browsardry, a solitary first-person dungeon RPG. Create one wide landscape illustration with 16:9 composition. Eye-level view standing on the cobbled main street of Lynd, a small medieval frontier village at dusk. Modest weathered timber and stone houses to either side, a welcoming inn with a warm lantern and doorway on the left, a smith and equipment shop with a subtle anvil by its doorway on the right, winding lane toward a low village gate and misty wooded hills. Hand-painted dark fantasy game background, detailed believable wood, slate, stone and worn cobbles, restrained gray-green and olive palette, soft amber window lights, ash-colored blue twilight. The village feels intimate, inhabited and safe before entering an underground crypt, no grand castle or royal capital. Composition legible on a mobile landscape viewport, strong depth, useful detail within central 80 percent. No people, no monsters, no text, no lettering on signs, no logos, no UI, no frames, no watermark. Opaque full bleed image.

## リンドの石壁のプロンプト

> Create one seamless tileable square game texture: an ancient dungeon wall made of large rough-cut weathered gray-green limestone blocks, staggered masonry joints, pitted and chipped stone surface, subtle darker aged crevices and restrained moss in some seams. Orthographic flat front view, full texture fills every edge. Four horizontal courses of medium large stones, approximately 3 or 4 blocks per row. Even neutral diffuse lighting with subtle natural ambient occlusion inside mortar only. No directional shadows, no vignette, no perspective, no floor, no sky, no objects, no borders, no text. All edges seamlessly tile. Muted gray-green earth tones for a dark medieval fantasy dungeon. This will be projected on a raycast 3D maze wall and shaded by distance in code; keep the base texture medium-light for legible detail on small mobile screens. Save output asset for project use.

## リンドの施設・街道のプロンプト

> Use case: stylized-concept. Asset type: production background for Browsardry first-person dark fantasy RPG. One wide landscape illustration, 16:9. Eye level view, hand-painted detailed believable medieval frontier village environment. Restrained gray-green, olive, aged timber and stone, warm amber lamps, quiet atmospheric dusk. No people, monsters, text, lettering, logos, UI, frames or watermark. Full bleed opaque. Scene:

### 各画像のScene指定

- `tavern.png`: Interior of a cozy rustic tavern, worn oak bar with mugs and barrels, tables and chairs, large warm hearth, exposed beams, dim leaded windows. Inviting gathering place for travelers.
- `smith.png`: Interior of a weapons shop and smithy. Forged swords on wall racks, armor on stands, anvil and tools in foreground, small orange forge glowing at rear. Clearly a medieval equipment shop.
- `pharmacy.png`: Interior of a small herbal apothecary. Shelves of glass potion bottles, bunches of drying herbs, mortar and pestle on a wooden counter, bundles of leaves and ceramic jars. Muted green medicine bottles catch warm lamplight.
- `inn.png`: Interior of a peaceful inn guest room. A neatly made simple bed, folded linen, bedside lantern, wooden chest and chair, small window overlooking misty roofs. A restful place to recover.
- `travel.png`: View just outside a medieval village gate looking away from town. Weathered gateposts frame a branching dirt road through rolling wooded hills into distant mist. Small unlettered wooden direction sign and lantern, a sense of departure and onward travel.
