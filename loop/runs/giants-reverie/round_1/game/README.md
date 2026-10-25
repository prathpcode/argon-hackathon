# Giants' Reverie

A 2D side-scrolling multiplayer browser MMO rebuilt from the surviving gameplay footage of *Glitch* (Videos A & B).

## How to Run

1. Ensure **Node.js 22+** is installed (zero external dependencies required).
2. Start the server:
   ```bash
   node server.js
   ```
   *(Set `PORT=3000` environment variable to override the default port `8090`.)*
3. Open `http://localhost:8090` in one or more browser windows (pass `?name=DeadSparrow&seed=42` in the URL to customize your name and deterministic RNG seed).
4. **Solo Mode:** If `public/index.html` is opened directly or the server is unreachable, the client runs solo with simulated Glitchen companions on the streets.

## Controls

- **Move Left / Right:** `A` / `D` or `Left` / `Right` Arrow keys
- **Jump:** `Space`, `W`, or `Up` Arrow key (jump onto house roof ledges, rock platforms, and floating Quoins)
- **Climb Ladders / Drop Through Platforms:** `W` / `S` or `Up` / `Down` Arrow keys
- **Interact with Trees, Rocks, Shrines, Vendors, Bureaucrats, or Players:** Click directly on any object or avatar in the world to open its verb menu
- **Use Inventory Items:** Click any item in the 16-slot bottom inventory bar to open its context verbs (`Drink`, `Eat`, `Taste`, `Bestow`, `Sprinkle`, `Play`, `Roll`, `Set out`, `Open/Close Bag`, `Drop`, `Inspect`)
- **Chat & Commands:** Type in the bottom-right chat box and press `Enter` (try `/thriller` or `/poof`)

---

## Feature-to-Footage Mapping

| Feature / Mechanic | Footage Timestamp(s) | Implementation Details |
| :--- | :--- | :--- |
| **5 Interconnected Streets** (*Beau's Home Street*, *Goli Grabs*, *Chego Chase*, *Andra Bureaucratic Hall*, *Bongul Beat*) | `A 00:00`, `A 24:36`, `B 00:06`, `B 03:34`, `B 05:41` | All 5 streets with distinct parallax layers, signposts, doors, and first-visit XP bonuses (`B 03:37`, `B 05:44`). |
| **Climbable House Roof Platforms** | `A 08:03`, `A 09:18–09:43` | Multi-tiered porch and roof ledges on Beau's crooked house. |
| **HUD Meters (Mood, Energy, iMG/XP, Currants, Level, Minimap)** | `A 00:10`, `B 00:31–00:41` | Top-bar Mood circle, Energy bar, Level/iMG pill, Currants counter, and clickable street minimap. |
| **16-Slot Inventory + Search Bar + Green Bag Expansion** | `A 00:10`, `A 10:18`, `A 24:46`, `B 03:51` | 16 primary slots, live text search filter, bag sub-bar, and `"Your bag is full!"` check. |
| **Cooperative Beryl Rock Mining** | `A 08:25–08:36` | Mining costs `-7 Energy`, awards `+10 iMG` and `+8 Chunks of Beryl`, plus `+1 Bonus Chunk` when co-mining. |
| **Wood Trees, Fruit Trees, Gas Plants, Dirt Piles & Tower Project** | `A 01:43–02:34`, `A 03:48`, `B 06:05`, `B 06:21` | Watering, petting, harvesting, digging with shovel, and contributing planks to the `11.4%` Tower project. |
| **Floating Quoins & Qurazy Quoin Banner** | `A 24:39`, `B 06:16–06:26` | Jumping into floating Quoins grants `+mood`, `+xp`, `+currants`, or `+energy`; Goli Grabs displays the Qurazy banner. |
| **Butler Roy & Visitor Log** | `A 01:19`, `A 19:16–19:23` | Butler NPC outside Beau's house with `"Who visited?"` IM report. |
| **Magic Rock & Home Street Style Switching** | `A 31:52–32:45` | Switch between *Lost Woods* (dark forest), *Vorn Road* (snowy pines), and *Andra Savanna* for `190 iMG`. |
| **Andra Bureaucratic Hall & 15s Waiting Area** | `B 03:38–05:25` | Water Cooler (`Cup of Water` `-5 mood`), Director Wigglesbottom, 15s `"Do not move, just wait"` timer, and Magister Piksnikson (`Card-Carrying Qualification (50c)`). |
| **Street Spirit Vendors & Animal Interactions** | `A 24:36`, `B 05:49–06:02` | Buy/Sell vendor modal, squeezing Chickens (`+1 mood`), petting Piggies, and massaging Butterflies with Butterfly Lotion (`Taste` for `+12 mood`, `B 04:08`). |
| **Pumpkin Ale Thriller Dance, Sparkle Powder, Random Kindness, Purple Essence** | `A 03:21`, `A 09:57`, `A 29:42`, `A 43:35`, `A 57:08` | Synchronized Thriller zombie dance & funk bassline, star shower, rainbow kindness, and avatar shrinking/embiggening. |
| **Musicblocks (GNG & DG-2), 12-Sided Die & Cubimal Races** | `A 20:01`, `A 24:17`, `A 50:39`, `A 54:15` | Web Audio lullaby/melody playback with floating speaker icon (`+10 iMG +2 Mood -2 Energy`), die rolling in words, and Cubimal plank racing. |
| **Daily 'hi'/'bye' Sign Match, High-Five, Hug & Conga Follow** | `A 19:37–19:43`, `A 24:31`, `A 26:15–28:55`, `A 53:11` | Matching greeting sign (`2x! +10 mood!`), High-five (`+30 mood`), Hug (`+3 mood`), and Conga line following across streets. |
| **Giant Visage Announcements (Cosma, Zille, Humbaba, Alph)** | `A 03:53`, `A 44:31`, `A 48:02`, `A 54:57` | Full-screen ornate Giant totem overlays with their exact shutdown speeches and fanfare chimes. |
| **Skills Tree, Brain Capacity & Quest Log** | `A 07:01`, `A 14:13–14:25`, `B 02:46–03:19` | Real-time skill countdowns, `Emblem of Friendly` time reduction (`A 24:10`), Brain Capacity penalty display, and live Quest progress tracking. |
| **Vanity Mirror & Wardrobe Customization** | `A 07:16–08:00`, `A 11:44–13:05`, `A 20:26` | Customize skin/hair/clothing colors, eye/height sliders, Red Top Hat, Imperial Caterpillar Mask, Censor Bar, and Dinosaur Ride. |
