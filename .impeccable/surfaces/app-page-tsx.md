---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/create","app/play"]
---

# Revive platform shell (home, create, play)

Mode: Operate. Visitors browse and launch games, and prompt the pi agent to build their own.

Audience/job: 13+ players and creators. The jobs are to find a game and play it with friends, or to describe an idea and watch it become a playable multiplayer game.
Constraints: stats must be real (live players, plays, votes). Starter games are labeled as starters. The visual direction is pinned by the user ("ui should kinda be like this"), using the Boxity.io home screenshot as the reference.

## Direction contract

THESIS: A Roblox-style platform home whose top row is a game-building prompt instead of a friends row. It refuses the chat-app layout (a centered prompt on an empty page) that AI builders default to: building sits inside a living game library.
OWN-WORLD: The ground is near-white with a cool tint. The sidebar and top bar are white with hairline dividers. Revive violet, the color of a glowing argon tube, is the one accent and carries the prompt bar, the Play buttons and the gem-like logo. Nunito runs at heavy weights (800/900) for titles and 600 for body. Thumbnails are big with 10px radii and carry the color. Stats use thumb and people icons with tabular numerals.
STORY: The visitor sees games they can play right now, understands that any of them could be their own, types an idea, and watches the agent build the map live.
FIRST VIEWPORT: A top bar with the logo, search and guest user. A left rail with Home, Create and My Games, and the guest card. The main column opens with the Build bar: an avatar, a large prompt input, idea chips and a violet Build button. Below it, "Playing now" and "Starter games" show as 6-up thumbnail grids.
FORM: The pinned reference layout (Roblox/Boxity home), translated to Revive's palette. The signature move is the Build bar plus a build page where the pi agent's log streams beside the live Three.js preview.
seed: none (pinned by user brief)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
