# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js / React (user's choice), run behind one custom Node server that also hosts the WebSocket multiplayer rooms. Game building runs on the pi agent harness (`@earendil-works/pi-coding-agent`, pi.dev) server-side with the Gemini model from `.env`; the key never reaches the client. Games run in Three.js. Storage is JSON files on disk for now. Deploy target: undecided.

## Users

Teens and adults (13+): hobbyists and casual creators who want to make games without learning an engine, and the players who come to play what others have made. Creating and playing carry equal weight; most users are expected to do both.

## Product Purpose

Revive is a Roblox-style game platform that runs in the browser. A user describes a game in one prompt and gets a playable 3D multiplayer game, which they can publish for others to discover and play. Success means a working, shareable game from a single prompt, and a library of community games worth coming back to play.

## Positioning

Web-based, with games made in one prompt. There's no download, no engine and no scripting step between an idea and a playable multiplayer game. Roblox needs a client install and Studio; Revive goes from a prompt to play in a browser tab.

## Operating Context

- Core loop: prompt a game → play and iterate on it → publish → others discover and play it together.
- Runs entirely in the browser on the web platform. Mobile web is still web.
- Games are 3D and multiplayer, so realtime sessions are part of the product, not an add-on.
- A Gemini model is configured in `.env` (`GEMINI_API_KEY`, `GEMINI_MODEL`); the pi agent harness drives generation on the building page.
- Every generated game builds its own 3D map and is played in Three.js. Every game is multiplayer so friends can play together; an invite link drops a friend into the same server.
- The home screen follows a Roblox-style platform layout (user-supplied reference: Boxity.io home). Its friends row is replaced by a prompt for building your own game from an idea.
- Users are guests with an auto-generated username and avatar color, kept in a cookie. There's no login yet.

## Capabilities and Constraints

Confirmed:
- One-prompt game generation that produces playable 3D games, with follow-up prompts to refine them on the building page.
- Multiplayer play.
- Publishing and discovery of community-made games.

Open decisions (do not invent):
- Real accounts and identity, social features, moderation approach, monetization.
- Deploy target.
- Product name styling or final branding beyond the working name "Revive".

## Brand Commitments

- Name: Revive (working name).
- The UI is simple and clean, never cluttered, the home page especially. Every element must earn its place.
- Polish is the brand: authored motion and small details (hover, press, entrance, loading and transition states) on every surface, respecting reduced motion.
- Layout follows the user-supplied Roblox-style reference (Boxity.io home).

## Evidence on Hand

A few hand-written starter games ship with the platform, labeled as starters. Beyond those there are no real users, games, testimonials, metrics or press yet. Stats shown in the UI must be real (live players from the multiplayer server, actual plays and votes). Future work must not fabricate player counts, featured games, creator quotes or ratings; use clearly labeled placeholders until real content exists.

## Product Principles

1. **Prompt to play, with nothing in between.** Every added step between the idea and a playable game has to justify itself.
2. **Creators and players are the same people.** Design so either loop flows into the other: playing should inspire making, and making should end in being played.
3. **The browser is the console.** No install, instant load and a shareable link are the product promise, not conveniences.
4. **Multiplayer by default.** A game is something you play with others; solo is the exception.
5. **Safe for a 13+ community.** User-generated content and live play with strangers require moderation and reporting from the start.

## Accessibility & Inclusion

Audience includes minors (13+): plan for content moderation, reporting and age-appropriate defaults in social and multiplayer features. No specific WCAG level has been set yet.
