---
name: Revive
description: A teletext service for lost games, where agents rebuild shut-down games from their surviving footage while you watch.
colors:
  black: "#000000"
  white: "#ffffff"
  red: "#ff0000"
  green: "#00ff00"
  yellow: "#ffff00"
  blue: "#0000ff"
  magenta: "#ff00ff"
  cyan: "#00ffff"
  blue-line: "#3d3dff"
  dim: "#8a8a8a"
typography:
  page-title:
    fontFamily: "Bedstead, ui-monospace, monospace"
    fontSize: "clamp(26px, 3.2vw, 40px)"
    fontWeight: 400
    lineHeight: 1.1
  header:
    fontFamily: "Bedstead, ui-monospace, monospace"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: "0.06em"
  section:
    fontFamily: "Bedstead, ui-monospace, monospace"
    fontSize: "19px"
    fontWeight: 400
  card-title:
    fontFamily: "Bedstead, ui-monospace, monospace"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.3
  nav:
    fontFamily: "Bedstead, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 400
  body:
    fontFamily: "Atkinson Mono, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  log:
    fontFamily: "Atkinson Mono, ui-monospace, monospace"
    fontSize: "13.5px"
    lineHeight: 1.5
  code:
    fontFamily: "Atkinson Mono, ui-monospace, monospace"
    fontSize: "12.5px"
    lineHeight: 1.6
rounded:
  none: "0px"
spacing:
  gutter: "clamp(16px, 2.4vw, 32px)"
  header: "40px"
  nav: "44px"
  page: "1480px"
  section: "40px"
  grid-gap: "26px 22px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "0 2ch"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.white}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cyan}"
    rounded: "{rounded.none}"
    padding: "0 1.6ch"
    height: "38px"
  button-ghost-hover:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
  soft-pill:
    backgroundColor: "transparent"
    textColor: "{colors.green}"
    rounded: "{rounded.none}"
    height: "30px"
  fastext-key-active:
    backgroundColor: "{colors.red}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    height: "34px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.cyan}"
    rounded: "{rounded.none}"
    height: "32px"
  chip-pressed:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.black}"
  input-field:
    backgroundColor: "{colors.black}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "10px 1.2ch"
  panel:
    backgroundColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "14px 1.6ch 16px"
  tag-running:
    backgroundColor: "{colors.magenta}"
    textColor: "{colors.black}"
    height: "24px"
  tag-done:
    backgroundColor: "{colors.green}"
    textColor: "{colors.black}"
    height: "24px"
  tag-error:
    backgroundColor: "{colors.red}"
    textColor: "{colors.black}"
    height: "24px"
  live-badge:
    backgroundColor: "{colors.red}"
    textColor: "{colors.black}"
    height: "24px"
---

# Design System: Revive

## Overview

Revive looks like a teletext service: a black screen, the eight broadcast colours at full strength, block type, and a fastext bar of coloured keys (the logo is the four fastext keys: red, green, yellow, cyan). Lost games belong to the broadcast era, and teletext was itself a lost medium, so the page reads as a service listing of what's left rather than a store. Every surface is square. Colour carries meaning, never decoration.

The live work of the agents is the show. The revival page is a control room: phases across the top, one agent's screen and log in the middle, and the roster, findings and footage at the side.

**Key characteristics:**
- Black ground everywhere, `color-scheme: dark`, with a faint CRT raster drawn over the whole page.
- Bedstead (an SAA5050 teletext face) for anything set like a teletext page: header, nav, headings, titles, tags and buttons. Atkinson Hyperlegible Mono for anything you read at length: body, logs, reasoning and code.
- No rounded corners, blurs, gradients or soft shadows. Depth is a hard offset block of colour.
- Lost things are grey and come back to colour: archive thumbnails sit in greyscale until hovered.

## Colors

The palette is the teletext set, used at full saturation and only for jobs.

### The eight
- **Black** (#000): The ground of every page, panel, field and badge.
- **White** (#fff): Primary text, and the hover fill of the primary button.
- **Yellow** (#ff0): Headings and page titles, the primary button, focus outlines, the caret, selection, the open tab's underline and the brand. Yellow means "you are here" or "do this".
- **Cyan** (#0ff): Secondary text (counts, ledes, see-all links, metadata), ghost buttons, chips and the Parity tab.
- **Green** (#0f0): Done and matched. Finished phases, passing footage rules, form labels, notes an agent found, and facts.
- **Magenta** (#f0f): Running. The phase in progress, live agents, reasoning, the activity dot, and the offset shadow under the primary button.
- **Red** (#f00): Live badges, errors, failing footage rules, delete on hover, and links to the original footage.
- **Blue** (#00f): Rules under the header and section heads, and the scrollbar. Blue only ever carries type as a band behind white text.

### Support
- **Blue Line** (#3d3dff): Blue lifted for outlines and lines on black: button, chip, field and panel outlines. Pure blue doesn't read as a thin line on black.
- **Dim** (#8a8a8a): Captions, sub-labels, waiting states and timestamps.
- Near-blacks (#050505, #0a0a0a) sit behind empty screens and thumbnails, so a loading frame never flashes.

### Named Rules
- **State colours are fixed.** Magenta running, green done, red error, blue-line waiting. Phases, agents, tags, roster entries and feed rows all use this mapping.
- **Fastext order is fixed.** Red Revivals, green Lost games, yellow Add a game. Each key's colour is its identity and always appears with its label.

## Typography

**Teletext face:** Bedstead (400 and 700, self-hosted in `public/fonts/`).
**Reading face:** Atkinson Hyperlegible Mono (variable 200–800, self-hosted), with tabular numerals on by default.

### Hierarchy
- **Page title** (Bedstead, clamp 26–40px, 1.1, yellow): Lost game, revival and new-revival titles.
- **Header** (Bedstead 700, 17px, 0.06em tracking, yellow): The brand in the top bar.
- **Section** (Bedstead, 19px, yellow): Section and panel heads, with counts beside them in cyan at 15px.
- **Card title** (Bedstead, 17px, 1.3, two-line clamp): Titles under thumbnails; 15px on mobile.
- **Nav** (Bedstead, 16px): Fastext keys; 14px on mobile.
- **Body** (Atkinson Mono, 15px, 1.55): Defaults and prose, which runs at most 72ch at 1.65.
- **Log** (Atkinson Mono, 13–13.5px): Feed rows, reasoning, findings and issues.
- **Code** (Atkinson Mono, 12.5px, 1.6): The code an agent wrote, with line numbers in #444.

### Named Rules
- **Bedstead never runs long.** If it's more than a line of reading, it's Atkinson.
- **One weight of Bedstead in content.** Headings are 400; only the brand uses 700.

## Layout

- A fixed 40px header (brand left, "Revive a game" right) over a fixed 44px fastext bar with a 2px blue rule under it. Content starts 26px below both.
- Pages are centred at 1480px max with a fluid 16–32px gutter.
- Card grids auto-fill at 240px minimum with 26px × 22px gaps; two columns on mobile.
- A lost game's page is a hero: a 16:9 thumbnail beside the title, Revive button and facts strip, then "How it was lost" and "Surviving footage".
- The revival page is the workshop. A row of phases (Collect, Remake, Playtest, plus Parity once there is a footage check) sits above a two-column grid. The main column holds the agent desk; the side column (300–380px, sticky) holds the roster, findings and footage. It drops to one column below 1180px.
- Parity puts the original footage and the rebuild's recording side by side, with the rule and its verdict underneath.

## Elevation & Depth

There are no soft shadows. Depth is a **hard offset**: the element moves up and left, and a solid block of colour appears behind it at the opposite corner.

- **Card lift:** the thumbnail translates (-4px, -4px) and casts `6px 6px 0` in the card's colour (cyan for revivals, green for lost games, red when hovering delete).
- **Button lift:** the primary button translates (-2px, -2px) and casts `4px 4px 0` magenta; on press it returns past its origin with no shadow.
- **Running glow:** the one exception. A running phase or agent pulses an 18px magenta glow, so live work is visible from across the room.
- A fixed raster of 1px white lines at 2.5% opacity sits above everything (z-index 100, no pointer events).

## Shapes

All corners are square. Outlines are 2px, drawn inset (`outline-offset: -2px`) so they never shift layout. Status dots and severity marks are squares, not circles. Thumbnails, screens and recordings are 16:9.

## Components

### Buttons
- **Primary** (`.btn-violet`, a name left over from the earlier design): yellow with black Bedstead, 42px tall. Hover turns it white with the magenta offset lift. Disabled turns it transparent with cyan text and a dashed blue-line outline.
- **Ghost:** transparent with a blue-line outline and cyan text; hover fills blue with white text.
- **Soft pill:** a green outline and green text; hover fills green with black text.
- **Icon button:** 34px square, cyan; hover fills red. Used for destructive actions.

### Fastext nav
Each key is a 12px colour square plus its label in that colour. Hover tints the key's colour at 18% over black. The current page fills solid with black text. A flashing magenta square on Revivals means agents are working.

### Cards
- **Revival card:** a 16:9 thumbnail with a status tag top-left (magenta running, green done or stopped, red error, blue queued) and a delete square top-right that appears on hover.
- **Lost game card:** the same frame in greyscale. Hover brings back the colour, zooms the image 5%, lifts it with a green block, and sweeps a raster line down the frame.
- Titles sit 12px under the thumbnail and take the card's colour on hover. Cards have no frame of their own.

### Chips and search
Archive filters are square chips with a blue-line outline and cyan text; pressed fills cyan. Search is a 38px outlined field whose outline turns yellow on focus.

### Fields
Black, with a 2px blue-line outline drawn inset: cyan on hover, yellow on focus. Labels are green Bedstead at 14px, with optional hints in dim. Errors are red Bedstead preceded by "▶".

### Phases
Numbered 34px squares joined by a line. Waiting is blue-line at half opacity. Running fills magenta, glows, and its connector marches as a dashed line. Done fills green; error fills red. Phases are tabs: the open one gets a yellow name and a 3px yellow bar underneath.

### Agent desk and roster
- **Desk:** one agent, outlined in its state colour. A header with a 38px state-coloured icon and its role, then its screen (a live badge in red, other players' screens top-right), then the feed.
- **Feed:** reads like a log. Each row is time, icon, text and an optional 64px frame. Icon colours follow the action: cyan tools, yellow speech and searches, magenta reasoning (which expands on click), green notes and passed checks, red footage questions and errors.
- **Code:** the file an agent wrote, with line numbers. Removed lines are on #1c0000 in light red; added lines are on #001c00 in light green.
- **Roster:** a compact row per agent with a 28px state square, name, last action and latest frame. Managed Agents carry a small cyan "Managed" tag. The selected row is outlined in yellow.
- **Issues:** square severity marks (red high, yellow medium, blue-line low) that expand to show detail and evidence.

### Parity
Each rule sits in a block with a 4px left bar in its verdict colour (green match, red mismatch, yellow unclear) over a 7% tint of that colour. The verdict is a solid tag. Previous and next buttons step through the rules.

## Motion

- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` for movement; linear at 90ms for colour changes.
- **Page arrival:** each top-level block appears in 16 raster steps over 520ms, staggered, the way a teletext page drew in.
- **Grids:** cards rise 10px and fade in, staggered 50ms apart.
- **Flashing:** live dots, the caret and error icons flash in hard 1s steps, never smooth.
- **Develop:** a lost game's hero image and the footage wall fade from grey to colour over 1.6–2.4s.
- **Reduced motion:** `prefers-reduced-motion: reduce` cuts every animation and transition to near zero.

## Do's and Don'ts

- **Do** keep every surface square, black and outlined at 2px inset.
- **Do** use the state colours exactly as mapped: magenta running, green done, red error.
- **Do** keep lost games grey until they're touched.
- **Do** pair every colour signal with text: a label, a tag or a verdict.
- **Don't** add rounded corners, blur, gradients or soft shadows.
- **Don't** set long text in Bedstead.
- **Don't** put text directly on pure blue lines; use blue-line for outlines and blue only as a band behind white.
- **Don't** introduce new hues. The eight teletext colours, blue-line and dim are the whole palette.
