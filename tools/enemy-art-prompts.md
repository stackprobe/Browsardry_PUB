# 敵ID 20〜37の立ち絵プロンプト

Built-in image_gen を使用。各敵を個別に生成し、`transparent_background: true` を指定。
出力先: `DocRoot/assets/enemies/<slug>.png`。
配信前にアルファ値5超の描画領域へ2pxの余白を加えて切り出し、縦横比と透過を維持してLanczosで310×268以内へ縮小する（`ART.md`の規約）。生成原寸を配信しない。

## 共通プロンプト

Use case: stylized-concept. Asset type: one transparent PNG enemy sprite for Browsardry, a first person dark fantasy dungeon RPG. Subject: {subject}. Belongs to {theme}. Detailed painterly realistic vintage RPG bestiary illustration matching existing grim medieval enemy sprites. One isolated character only, full body entirely visible including weapon and feet, centered, facing viewer in combat ready pose, occupying 85 percent of square canvas, clear readable silhouette. Rich texture, muted colors, subtle warm edge light. Transparent background with real alpha. No ground plane, environment, scenery, border, text, labels, watermark, or multiple views.

## theme

- town 0: a dusty medieval underground catacomb, brown iron and bone palette
- town 1: a sealed royal underground vault, tarnished gold and dark blue palette
- town 2: a sealed fallen cathedral mausoleum, ivory ash and faded crimson palette

## subject

- ID 20 / town 0 / 墓穴の大蜘蛛 / `crypt-spider`: a huge hairy crypt spider, bone fragments and dusty web strands on its abdomen
- ID 21 / town 0 / 棺の亡者 / `coffin-wight`: a gaunt mummified wight emerging upright with broken coffin planks chained to its back
- ID 22 / town 0 / 墓荒らしの頭目 / `tomb-raider`: a sinister tomb raider captain in ragged leather carrying a hooked pickaxe and a sack of stolen burial relics
- ID 23 / town 0 / 骸骨の重衛兵 / `bone-guardian`: an imposing skeletal heavy guard with corroded iron tower shield and battered flanged mace
- ID 24 / town 0 / 弔鐘の亡霊 / `mourning-wraith`: a floating hooded burial wraith with tattered gray grave shroud and a small cracked funeral bell
- ID 25 / town 0 / 納骨堂の死霊術師 / `ossuary-necromancer`: a sinister ossuary necromancer in bone adorned charcoal robes with skull staff and a dim green soul flame
- ID 26 / town 1 / 王印の魔道書 / `royal-grimoire`: a levitating open royal grimoire with tarnished gold crowned clasps, animated parchment wings and faint violet runes
- ID 27 / town 1 / 封庫の擬態箱 / `vault-mimic`: 下記の専用プロンプトを使用
- ID 28 / town 1 / 鎖の獄吏 / `chain-jailer`: a hollow armored royal jailer wrapped in heavy chains, carrying a spiked iron flail and a ring of prison keys
- ID 29 / town 1 / 黒冠の近衛長 / `black-crown-captain`: an imposing undead royal guard captain with black crown shaped helmet, dark blue cape and ornate two handed halberd
- ID 30 / town 2 / 燭台の侍者 / `candle-acolyte`: a faceless acolyte in ash stained ivory robes holding a tall iron candelabrum of ghostly pale candles
- ID 31 / town 2 / 贖罪の鎖僧 / `penitent-monk`: a penitential undead monk in tattered ceremonial robes, iron chains across the body and an enormous weighted censer flail
- ID 32 / town 2 / 聖骸の番人 / `reliquary-keeper`: a skeletal reliquary keeper encased in a gilded rib cage shrine with bone white tabard and ceremonial spear
- ID 33 / town 2 / 沈黙の聖歌隊 / `silent-chorister`: a single spectral cathedral chorister with a sealed gold funeral mask and floating torn hymn pages around ash white robes
- ID 34 / town 2 / 断罪の司祭 / `judgment-priest`: a corrupted high priest with cracked ivory mitre, crimson stole and heavy iron liturgical execution hammer
- ID 35 / town 2 / 聖灰の巨兵 / `sacred-ash-colossus`: a hulking sacred ash stone golem with broken cathedral carvings, gilded cracks and a smoldering hollow chest
- ID 36 / town 2 / 封印の熾天使 / `sealed-seraph`: a terrifying bound seraph statue of pale stone, six broken folded wings, iron sealing bands and a radiant cracked golden halo
- ID 37 / town 2 / 灰冠の預言者 / `ash-crown-prophet`: a levitating skeletal prophet with a crown of cooled ash, charred ivory vestments, a twisted reliquary staff and a faint amber soul flame

## ID 27 の専用プロンプト

Use case: stylized-concept. One isolated full body royal treasure chest mimic enemy sprite for a medieval dark fantasy RPG. An ornate dark blue and tarnished gold royal chest with gaping tooth lined mouth, clawed feet and short tongue. Detailed painterly realistic vintage bestiary illustration, muted rich colors and warm edge light. Full creature centered, entire silhouette visible, transparent background with real alpha, no ground, scenery, text, border or labels.
