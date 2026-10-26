---
name: Revive
description: A browser game platform where one prompt becomes a playable 3D multiplayer game.
colors:
  revive-violet: "#7c3aed"
  revive-violet-deep: "#6a2bd9"
  violet-mist: "#f1eafe"
  violet-edge: "#d9c8fb"
  gem-light: "#a78bfa"
  gem-pale: "#c4b5fd"
  live-green: "#22c55e"
  danger-red: "#dc2626"
  danger-mist: "#fdecec"
  ground-white: "#ffffff"
  surface-white: "#ffffff"
  muted-fill: "#f2f2f4"
  hover-fill: "#f4f4f6"
  active-fill: "#ebebee"
  hairline: "#e4e4e8"
  hairline-strong: "#d3d3d9"
  ink: "#1f1d24"
  ink-soft: "#3d3a44"
  ink-quiet: "#6e6a78"
  black-pill: "#141217"
  play-void: "#0d0b14"
typography:
  display:
    fontFamily: "Nunito Variable, Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Nunito Variable, Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "25px"
    fontWeight: 900
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Nunito Variable, Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.25
  nav:
    fontFamily: "Nunito Variable, Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
  body:
    fontFamily: "Nunito Variable, Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  body-long:
    fontFamily: "Nunito Variable, Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.55
  label:
    fontFamily: "Nunito Variable, Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 800
  stat:
    fontFamily: "Nunito Variable, Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    fontFeature: "tnum"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "14px"
    lineHeight: 1.55
rounded:
  badge: "8px"
  card: "10px"
  control: "12px"
  panel: "14px"
  composer: "18px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  gutter: "22px"
  section: "30px"
  block: "34px"
  topbar: "58px"
  sidebar: "276px"
components:
  button-primary:
    backgroundColor: "{colors.revive-violet}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.revive-violet-deep}"
  button-play:
    backgroundColor: "{colors.revive-violet}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.panel}"
    height: "64px"
    width: "100%"
  button-ghost:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "0 16px"
    height: "42px"
  button-ghost-hover:
    backgroundColor: "{colors.hover-fill}"
  button-black-pill:
    backgroundColor: "{colors.black-pill}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.card}"
    padding: "0 13px"
    height: "40px"
  soft-pill:
    backgroundColor: "{colors.muted-fill}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.badge}"
    padding: "0 12px"
    height: "30px"
  chip:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "34px"
  chip-hover:
    backgroundColor: "{colors.violet-mist}"
    textColor: "{colors.revive-violet-deep}"
  prompt-box:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.pill}"
    padding: "0 8px 0 22px"
    height: "62px"
  input-field:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "48px"
  nav-item:
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "0 16px"
    height: "56px"
  nav-item-active:
    backgroundColor: "{colors.active-fill}"
  game-card-thumb:
    backgroundColor: "{colors.muted-fill}"
    rounded: "{rounded.card}"
  status-chip-building:
    backgroundColor: "{colors.violet-mist}"
    textColor: "{colors.revive-violet-deep}"
    rounded: "{rounded.badge}"
    padding: "0 10px"
    height: "28px"
---

# Design System: Revive

## Overview

**Creative North Star: "The Lit Arcade Shelf"**

Revive is a bright, white game shelf: a fixed top bar and left rail frame a main column where big thumbnails carry all the color and the chrome stays quiet. The one accent, revive violet, glows only where something can be started (Build, Play, the prompt focus ring, the active nav icon), like the discharge tube it is named for. Everything else is white surface, hairline dividers, and near-black ink set in heavy, rounded Nunito.

Density is generous and toy-friendly rather than dense: 19px navigation, 56px nav rows, 46-64px buttons, 22px gutters. Corners are soft at every scale and pills are reserved for the things you type into or press to start. Depth is almost absent at rest; motion carries the polish instead. The shell holds still while page content trades places, content rises into place once on first load, cards lift on hover, a game's thumbnail morphs from card to hero to the play screen, and live things breathe with a soft pulse ring.

The surfaces stay uncluttered: every element on the home page is either the Build bar or a game. The play page inverts the world to a near-black void with dark glass controls, so the game owns the screen.

**Key Characteristics:**
- Pure white ground and surfaces, separated by 1px hairlines, never by tint or shadow.
- One accent (revive violet) reserved for start actions, focus, and "in progress" states.
- Nunito at 600 for body and 800/900 for anything named; tabular numerals on every stat.
- Thumbnails are the color: big 261:147 frames with 10px corners.
- Motion on every surface, a still shell during navigation, one easing curve, all of it switched off under reduced motion.

## Colors

A white, near-monochrome shell with a single glowing violet and two signal colors.

### Primary
- **Revive Violet** (revive-violet): Build and Play buttons, focus outlines, the focused prompt border, the active nav icon, the vote bar fill, the pressed in-game glass toggle, the "building" tag. The only saturated hue in the chrome.
- **Revive Violet Deep** (revive-violet-deep): Primary hover, and violet text on light fills (creator name, "New" stat, chip hover, building status, selection text).
- **Violet Mist** (violet-mist): The soft fill behind violet states: 4px focus halo around the prompt and composer, pressed vote, chip hover, user chat bubbles, text selection.
- **Violet Edge** (violet-edge): Border for violet-tinted pressed and hover states.
- **Gem Light / Gem Pale** (gem-light, gem-pale): Facets of the logo mark and the play-page loader bar. Brand mark only.

### Secondary
- **Live Green** (live-green): Live-player dots and the guest online dot, always with the pulse ring. Ready states use a darker green pair in the builder.
- **Danger Red / Danger Mist** (danger-red, danger-mist): Form errors, failed tags, error tool rows and error cards.

### Neutral
- **Ground White / Surface White** (#ffffff both): The page ground, top bar, sidebar, cards and inputs. They are the same white; separation comes from hairlines.
- **Muted Fill** (muted-fill): Empty thumbnails, the build circle, soft pills, tool rows, the builder stage backdrop, code blocks.
- **Hover Fill / Active Fill** (hover-fill, active-fill): Nav and ghost hover; current nav item and soft-pill press.
- **Hairline / Hairline Strong** (hairline, hairline-strong): Dividers, chip and panel borders / input, prompt and ghost-button borders, scrollbar thumb.
- **Ink, Ink Soft, Ink Quiet** (ink, ink-soft, ink-quiet): Titles and body / secondary text and stats / placeholders, captions, meta.
- **Black Pill** (black-pill): The sidebar's solid black action pill; also the draft tag (in ink).
- **Play Void** (play-void): Behind the game iframe and the builder preview, so a loading game never flashes white.

### Named Rules
**The One Glow Rule.** Violet marks what starts, focuses, or is in progress. It never decorates a heading, divider, or background panel.

**The Same White Rule.** Ground and surfaces are both #ffffff. Separate regions with a 1px hairline, not a tinted ground or a shadow.

## Typography

**Display Font:** Nunito Variable (with Nunito, ui-rounded, system-ui)
**Body Font:** Nunito Variable, same family
**Label/Mono Font:** ui-monospace stack, docs code only

**Character:** One rounded humanist family carries the whole product, and hierarchy is made almost entirely by weight. Body defaults to 600, which gives the toy-like, friendly solidity; names and numbers go to 800-900.

### Hierarchy
- **Display** (900, 36px, 1.1, -0.02em): Game page title. Page titles on simple pages use 32px/900; the play loader 30px/900.
- **Headline** (900, 25px, -0.01em): Section heads ("For You", "About", "Servers"); 21px on mobile. Small section heads drop to 19px/700.
- **Title** (800, 20px, 1.25): Card titles, two-line clamp; builder chat head. 17px on mobile.
- **Nav** (700-800, 19px): Rail items, top links, see-all links, the prompt input text.
- **Body** (600, 16px, 1.45-1.5): Chat messages, docs, defaults. Long prose is 18px/1.55 at 72ch max in ink-soft.
- **Label** (800, 15px): Field labels, chips (700), badges (800-900 at 13-15px).
- **Stat** (700, 18px, tabular numerals): Rating and visit counts on cards; facts values 21px/900.

### Named Rules
**The Weight Ladder Rule.** Hierarchy steps by weight first (600 body, 700 nav, 800 titles, 900 headings), size second. Never below 600 in the shell.

**The Tabular Count Rule.** Every live count, rating, vote and fact uses tabular numerals so numbers never jitter as they update.

## Layout

A fixed application shell: a 58px top bar (three-column grid: brand column matching the rail width, centered links and search, user chip) and a 276px left rail with the profile card, nav and footer links. The main column sits right of the rail with 22px padding and 48px bottom space; sections stack with 30px between them and 16px from head to content.

Game grids are 6-up at 22px gaps, stepping to 5 (<=1700px), 4 (<=1440px), 3 (<=1180px) and 2 (<=760px, 14px gaps). At 1180px the rail collapses to an 84px icon rail; at 760px it becomes a 64px bottom tab bar, the top links hide, and the build circle drops so the prompt fills the width. The game page is a 1.6fr/1fr hero (thumbnail beside info, max 1480px) that stacks at 1180px. The builder is a fixed two-pane split: a 340-440px chat column beside the live stage, which moves above the chat (46vh) on mobile. Simple pages cap at 820px.

Spacing recurs on 8, 12, 16, 22 and 34px; 22px is the house gutter.

## Elevation & Depth

Flat by default. Surfaces are white on white with hairlines; nothing in the shell carries a shadow at rest. Shadows appear only as a response to state, or for things that float over content.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 14px 28px -12px rgb(31 29 36 / 0.35), 0 4px 10px -6px rgb(31 29 36 / 0.2)`): Under a thumbnail while hovered and raised 4px.
- **Violet glow** (`box-shadow: 0 8px 20px -8px rgb(124 58 237 / 0.7)`): Under an enabled violet button on hover.
- **Focus halo** (`box-shadow: 0 0 0 4px var(--violet-soft)`): Around the focused prompt box and composer.
- **Pop** (`--shadow-pop`): Floating toasts like "Invite link copied".
- **Pulse ring** (animated `box-shadow` from 0 to 6px, fading): Live and notification dots.

### Named Rules
**The Flat-At-Rest Rule.** If it is not hovered, focused, pressed, or floating, it has no shadow.

## Shapes

Soft rounded rectangles at every scale, chosen by size: 8px for badges, soft pills, status chips and keycaps; 10px for thumbnails, nav rows, ghost buttons and vote buttons; 12px for fields, server rows, glass controls and error cards; 14px for the hero thumbnail, panels, the stage and the Play button; 18px for the chat composer. Full pills (999px) are reserved for the prompt box, the search field, idea chips and the violet Build button. Circles are for avatars, live dots, swatches and the build tile. Borders are 1.5px on interactive outlines and 1px on dividers. The build tile carries a static dashed ring (7/7 dash) that only changes color.

## Components

### Buttons
Rounded, heavy-lettered, and they all press.
- **Shape:** Pill for Build (999px), 14px for the full-width Play button, 10px for ghost and black pills.
- **Primary:** Revive violet, white 900-weight 18px text, 46px tall, 22px side padding; the Play button is 64px tall at 22px text.
- **Hover / Focus:** Hover deepens to revive-violet-deep and adds the violet glow; trailing arrows slide 4px right. Press scales to 0.97. Disabled fades to a pale violet with no motion.
- **Ghost:** White with a 1.5px strong hairline, 800-weight ink, hover-fill on hover, press to 0.96.
- **Black pill:** Solid near-black, 900 weight, its icon tilts -14deg on hover.
- **Soft pill:** Muted fill, 8px corners, its icon spins 18deg and grows on hover.

### Chips
- **Style:** White pill with a 1.5px hairline, 15px/700 ink-soft.
- **State:** Hover tints to violet mist with violet edge and deep violet text; press 0.96.

### Cards / Containers
- **Corner Style:** 10px on the thumbnail; the card itself has no frame.
- **Background:** The thumbnail carries the color; empty frames use muted fill with a faint dot pattern.
- **Shadow Strategy:** Card lift on hover only (see Elevation).
- **Border:** None. Panels and server rows use a 1.5px hairline at 14px / 12px.
- **Internal Padding:** None on cards (title sits 12px under the thumb); panels 22px.
- **Overlays:** A dark translucent live badge bottom-left with a pulsing green dot; a white tag badge top-left (Starter), inverted for Draft, violet and breathing for Building, red for Failed.

### Inputs / Fields
- **Style:** White, 1.5px strong hairline; pill for search and prompt, 12px for form fields. Placeholders in ink-quiet, violet caret.
- **Focus:** Border turns revive violet; the prompt box and composer add the 4px violet-mist halo.
- **Error / Disabled:** Error text in danger red slides open below the prompt; a disabled prompt fades to 60%.

### Navigation
- **Style:** 56px rows, 19px/700, 26px stroked icons, 10px corners.
- **States:** Hover fills hover-fill and grows the icon to 1.1; the current page fills active-fill and turns its icon violet; press scales to 0.98. A red notification dot pulses when a build is running.
- **Top links:** Icon tilts -12deg on hover while an underline draws in from the left.
- **Mobile:** Icon-only rail at 1180px, bottom tab bar at 760px.

### Build Bar (signature)
The home page opens with a 134px circular Build tile (muted fill, static dashed ring, plus icon) beside a 62px pill prompt, a static example placeholder, and the violet Build button inside the pill. Hovering or focusing anywhere in the row tints tile, ring and icon violet and turns the plus 90deg; while starting, the row stays violet and the button shows a spinner.

### Builder
Chat log beside a dark live stage. Log entries rise in; tool rows sit on muted fill with a spinning loader while running and a popped check when done; user messages are violet-mist bubbles with a tucked bottom-right corner (16/16/4/16). While waiting, the stage shows six violet squares stacking in sequence over a faint violet dot field.

### Play Surface and HUD
Full-bleed game on play-void. While the game loads, its thumbnail fills the screen as a backdrop (over a violet radial when there is no thumbnail), dimmed by a dark vignette with a 6px blur; a floating gem with a violet drop-shadow, the title, the creator and an indeterminate gem-light bar rise in over it. When the game reports ready, the loader fades out over 0.55s and the game frame fades in while settling from 1.015 scale. Controls are dark glass (rgb(17 14 24 / 0.68), 12px, white 800 text) that fade in after 0.45s; a pressed toggle turns violet. The in-game HUD repeats the glass language (rgb(17 12 32 / 0.62), 10-12px corners, 800 weight, tabular numerals) and a pill hint at the bottom.

### Motion grammar
- **Easing:** One curve, `cubic-bezier(0.16, 1, 0.3, 1)`, for every transform; plain ease-out for fades. Page exits use an accelerating `cubic-bezier(0.4, 0, 1, 1)`; the thumbnail morph uses `cubic-bezier(0.22, 1, 0.36, 1)`.
- **The shell holds still:** The top bar and sidebar are their own view-transition layers with no animation, and the root crossfade is off, so navigation never moves the chrome.
- **Page change:** Outgoing page content fades up 6px in 160ms; incoming content rises 12px in 380ms after an 80ms beat. Every shell route remounts through one template, so all pages share this.
- **First-load entrances:** On the first load only, main sections rise 12px over 0.6s (second and third staggered 0.06s) and cards rise staggered 35ms per index after 0.1s, capped at 14 steps. After the first navigation the document is marked and these CSS entrances switch off, leaving entrance motion to the view transitions.
- **Card lift:** Thumbnail raises 4px with the lift shadow over 0.4s, the image drifts to 1.05 over 0.7s, the title turns deep violet; press settles to -1px and 0.985 in 0.12s. Images fade in on load; loading frames shimmer.
- **Thumbnail morph:** One shared element travels card, then game-page hero, then full-screen play backdrop, over 0.55s with 12px corners and cover cropping, layered above the page change. The Continue row opts out so one game never morphs from two places.
- **Live:** Pulse rings (1.8s live, 2.4s online), a 1.6s breathe on Building tags, pop on toggled votes and completed steps, a 6s glint across the logo.
- **Reduced motion:** All animation and transition durations collapse to 0.01ms; entrance animations and every view transition (page change and morph) are removed outright.

## Do's and Don'ts

### Do:
- **Do** keep ground and surfaces pure white (#ffffff) and divide regions with 1px hairlines.
- **Do** reserve revive violet for Build, Play, focus, the current nav icon and in-progress states.
- **Do** set body at 600 and anything named at 800-900 in Nunito, with tabular numerals on every count.
- **Do** give every interactive element a hover, a press (scale 0.95-0.98) and an entrance, all on the single ease-out curve.
- **Do** honor reduced motion by removing entrances and view transitions, not just shortening them.
- **Do** let thumbnails carry the color at 10px corners, and morph the same thumbnail from card to hero to play backdrop.
- **Do** keep the top bar and sidebar still on navigation; only page content exits (160ms) and enters (380ms).

### Don't:
- **Don't** animate placeholder text with a typewriter effect; it was removed at the user's request, and placeholders are static examples.
- **Don't** spin dashed rings; the spinning ring was removed at the user's request, and the build tile's dashed ring only changes color.
- **Don't** re-run CSS entrance staggers after the first navigation; view transitions own entrance motion from then on.
- **Don't** add shadows to resting surfaces; shadows answer hover, focus, press or floating.
- **Don't** introduce a second accent hue in the chrome; green and red are signals only.
- **Don't** add elements to the home page that are neither the Build bar nor games.
