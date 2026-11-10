# Crownfall: Cannon Rush

An offline 3D arcade campaign with **12 fortresses, 36 waves, and three bosses**. Grow your army through maths gates, choose your route, and bring down the Iron Crown.

## Play

Open **index.html** in a modern browser. Keep `game.js`, `styles.css`, and `vendor-bundle.js` beside it. Everything is bundled locally; no internet connection or installation is required.

Alternatively, double-click **START-WINDOWS.bat**, run `python3 start.py`, or run `./start.sh`. These launchers require Python 3 and open a local web server.

## Controls

- The cannon fires automatically, starting aimed at a usable gate.
- Tap **Left route** or **Right route** for a quick choice. The cards show the gate sequence and expected troop count.
- Drag anywhere on the battlefield to steer smoothly. Tap a position to aim there.
- Hold **left/right arrows** or **A/D** for continuous keyboard steering.
- Click **Pause**, or press **P** or **Escape**, to pause and resume. Switching away automatically pauses combat.
- Sound can be toggled during play. Losing a wave lets you retry it with your earned upgrades.

## Gate maths

Each cannon shot starts a squad. Troops created by gates stay in that squad.

- **+N** adds N troops once per squad per gate.
- **×N** multiplies each troop that passes.
- **1 → +3 = 4 → ×2 = 8**, while **1 → ×2 = 2 → +3 = 5**.

The calculations follow the gates in travel order. The route cards estimate a fresh squad before casualties, moving gates, troop spread, or the shared **135-troop limit** reduce its size. Predicted gates glow while you aim.

## Battles and upgrades

Each fortress has three waves. A fresh timer starts every wave: **75 seconds**, or **100 seconds** for a boss. Between waves, combat stops while you choose one upgrade:

- **Rapid loader:** 25% faster firing per rank.
- **Reinforced shields:** absorb one extra hit per troop per rank.
- **Siege training:** +1 fortress damage per troop per rank.

Upgrades stack within the fortress and survive retries and reloads. Entering the next fortress resets them. Gate descendants inherit their source troop's remaining armor.

On split routes, guard troops deal 2 base fortress damage and raid troops deal 3. Committed paths avoid unavoidable spike beds; sweepers, ranged attacks, and defenders still threaten the crew.

Guards anticipate troop routes, choose interceptions they can reach, and divide targets between themselves. Ranged defenders seek groups and reserve separate firing lanes. Red warnings stay in their committed lane for 1.25 seconds before the shot. New ranged attacks wait while a boss attack charges.

Bosses alternate their exposed side, enrage at half health, and target crowded lanes. The teal side takes full damage; the other shield reduces damage by roughly 70%, with a minimum of one damage per surviving troop. The exposed side changes every 8 seconds, or 6 seconds when enraged.

| Stage | Fortress |
| --- | --- |
| 1 | Harbor Approach |
| 2 | Crosswinds |
| 3 | The Citadel |
| 4 | Splitwater Crossing |
| 5 | Ember Bastion — boss |
| 6 | Moonlit Canal |
| 7 | Frostwatch |
| 8 | Stormkeep — boss |
| 9 | Sunken Ramparts |
| 10 | Cinder Reach |
| 11 | Royal Causeway |
| 12 | The Iron Crown — final boss |

## Saves

Checkpoints are saved at each new wave. Reloading during an upgrade choice preserves the pending reward. **Continue Campaign** returns to your saved wave with a fresh timer. **New Campaign** clears progress.

Saves belong to the browser and address used to play. If browser storage is unavailable, the current session still works.

## Project files

- `index.html`: screens and interface.
- `styles.css`: responsive desktop and phone layouts.
- `game.js`: gameplay, level data, animation, controls, and rendering.
- `vendor-bundle.js`: bundled Three.js, GLTFLoader, and local model data.
- `tests/gameplay.cjs`: browser checks for controls, AI, gate maths, upgrades, and saving.
- `tests/campaign.cjs`: plays all 36 waves through actual combat using route decisions and earned upgrades.

The browser checks require Node.js, Playwright, and Edge. Run `node tests/gameplay.cjs` and `node tests/campaign.cjs` in an environment where Playwright is available. Set `CROWNFALL_BROWSER` to use another Chromium browser executable.

## Art and licenses

The closer orthographic battlefield keeps gates readable on phones. Animated crew sprites use eight shared canvas frames, reducing the separate meshes required for a large army. Fortress damage, cannon recoil, impact rings, and procedural music are rendered locally.

Castle towers, doorways, pennants, and ballistae come from [Kenney's Castle Kit](https://kenney.nl/assets/castle-kit), licensed CC0. Selected source models and their license are in `assets/models`. Three.js and GLTFLoader are MIT licensed; their license notice is preserved in `vendor-bundle.js`.
