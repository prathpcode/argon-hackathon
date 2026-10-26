// Streets of Ur: multi-layer parallax backgrounds, platforms, interactive nodes, NPCs, creatures, and orbs
(function () {
  const { drawRoundedRect } = window.AvatarRenderer;

  function createStreets() {
    return {
      home_street: {
        id: "home_street",
        name: "Beau's Home Street",
        region: "Ur Home",
        width: 2200,
        groundY: 375,
        theme: "lost_woods", // can be toggled to 'vam_road' via Magic Rock
        spawnX: 680,
        platforms: [
          // Fruit & Paper tree canopies
          { x: 140, y: 270, w: 120, label: "Blossom Branch" },
          { x: 460, y: 265, w: 120, label: "Paper Canopy" },
          // House of Whimsy steps, porch, 2nd story ledge, and crooked roof peaks
          { x: 650, y: 335, w: 90, label: "Porch Steps" },
          { x: 640, y: 255, w: 230, label: "Second Story Balcony" },
          { x: 660, y: 175, w: 190, label: "Crooked Roof Peak" },
          // Climbable dark forest branches & Wood Tree plank ledges
          { x: 960, y: 285, w: 140, label: "Low Bough" },
          { x: 1150, y: 220, w: 150, label: "High Bough" },
          { x: 1350, y: 290, w: 120, label: "Sapling Plank" },
          { x: 1520, y: 235, w: 140, label: "Wood Tree Plank" },
          { x: 1700, y: 185, w: 150, label: "Crown Plank" },
          { x: 1920, y: 275, w: 150, label: "Tower Scaffold" },
        ],
        nodes: [
          {
            id: "home_fruit_tree",
            type: "fruit_tree",
            name: "Fruit Tree",
            desc: "A blossoming cherry tree heavy with ruby fruit.",
            x: 200,
            y: 375,
            w: 95,
            h: 145,
            verbs: [
              { id: "harvest_cherry", label: "Harvest", energy: -4, xp: 10, item: "cherry", count: 2 },
              { id: "water_tree", label: "Water", energy: -3, xp: 8, mood: 2 },
              { id: "pet_tree", label: "Pet", energy: -2, xp: 6, mood: 3 },
            ],
          },
          {
            id: "home_beryl",
            type: "beryl_rock",
            name: "Beryl Rock",
            desc: "A big, chiseled cyan rock containing 5 gleaming chunks.",
            x: 335,
            y: 375,
            w: 78,
            h: 68,
            chunks: 5,
            maxChunks: 5,
            verbs: [
              { id: "mine", label: "Mine", energy: -7, xp: 10, item: "beryl", count: 1 },
              { id: "help_mine", label: "Help mine (Co-op Bonus)", energy: -5, xp: 14, item: "beryl", count: 2 },
              { id: "talk_rock", label: "Talk to", xp: 2, mood: 1 },
            ],
          },
          {
            id: "home_sign_left",
            type: "signpost",
            name: "Signpost to Andra & Kalavana",
            desc: "Wooden arrows pointing toward Chego Chase and Goli Grabs.",
            x: 430,
            y: 375,
            w: 55,
            h: 82,
            verbs: [
              { id: "go_chego", label: "Go to Chego Chase (Andra)", target: "chego_chase" },
              { id: "go_bongul", label: "Go to Bongul Beat (Andra)", target: "bongul_beat" },
              { id: "go_goli", label: "Go to Goli Grabs (Kalavana)", target: "goli_grabs" },
            ],
          },
          {
            id: "home_paper_tree",
            type: "paper_tree",
            name: "Paper Tree",
            desc: "A pale-pink trunk with curled branches growing crisp sheets of paper.",
            x: 525,
            y: 375,
            w: 90,
            h: 140,
            verbs: [
              { id: "harvest_paper", label: "Harvest Paper", energy: -4, xp: 9, item: "paper", count: 2 },
              { id: "water_tree", label: "Water", energy: -3, xp: 7, mood: 2 },
              { id: "pet_tree", label: "Pet", energy: -2, xp: 5, mood: 2 },
            ],
          },
          {
            id: "magic_rock",
            type: "magic_rock",
            name: "Magic Rock",
            desc: "An ancient, opinionated stone on a pedestal. Knows quests and street styles.",
            x: 615,
            y: 375,
            w: 48,
            h: 54,
            speech: "Want to know what I know? Talk to me!",
            verbs: [
              { id: "quest_rock", label: "Ask for Quest / Advice", xp: 8, mood: 4 },
              { id: "style_toggle", label: "Switch Street Style (Lost Woods / Vam Road)", energy: -15, xp: 20 },
              { id: "stroke_rock", label: "Polite Pat (+3 Mood)", mood: 3, xp: 3 },
            ],
          },
          {
            id: "house_of_whimsy",
            type: "house",
            name: "House of Whimsy",
            desc: "A crooked, multi-story teal & purple home with climbable roofs and warm windows.",
            x: 760,
            y: 375,
            w: 195,
            h: 225,
            verbs: [
              { id: "rest_house", label: "Rest on Porch (+25 Energy, +5 Mood)", energy: 25, mood: 5, xp: 5 },
              { id: "admire_house", label: "Admire Architecture (+4 XP)", xp: 4, mood: 2 },
            ],
          },
          {
            id: "butler_roy",
            type: "butler",
            name: "Roy (Butler)",
            desc: "Your faithful, slightly dapper grey butler. Keeps the visitor log and dances jigs.",
            x: 905,
            y: 375,
            w: 44,
            h: 66,
            pose: "dapper",
            speech: "Welcome home! Care for a spot of cheer?",
            verbs: [
              { id: "who_visited", label: "Who visited?", xp: 4, mood: 3 },
              { id: "butler_gift", label: "Collect Daily Allowance (+25 Currants)", xp: 8, mood: 5 },
              { id: "butler_highfive", label: "High five Roy (+15 Mood)", mood: 15, xp: 8 },
              { id: "butler_jig", label: "Request a Jig", mood: 6, xp: 4 },
            ],
          },
          {
            id: "wood_tree_1",
            type: "wood_tree",
            name: "Wood Tree Sapling",
            desc: "A young 3-branch wooden-plank tree.",
            x: 1410,
            y: 375,
            w: 75,
            h: 115,
            verbs: [
              { id: "harvest_plank", label: "Harvest Planks", energy: -5, xp: 10, item: "plank", count: 2 },
              { id: "water_tree", label: "Water", energy: -3, xp: 8, mood: 2 },
              { id: "pet_tree", label: "Pet", energy: -2, xp: 6, mood: 2 },
            ],
          },
          {
            id: "wood_tree_2",
            type: "wood_tree_tall",
            name: "Tall Wood Tree",
            desc: "A sturdy 4-branch plank tree stretching into the mist.",
            x: 1590,
            y: 375,
            w: 90,
            h: 165,
            verbs: [
              { id: "harvest_plank", label: "Harvest Planks", energy: -5, xp: 12, item: "plank", count: 3 },
              { id: "water_tree", label: "Water", energy: -3, xp: 8, mood: 2 },
              { id: "pet_tree", label: "Pet", energy: -2, xp: 6, mood: 3 },
            ],
          },
          {
            id: "bubble_tree_home",
            type: "bubble_tree",
            name: "Bubble Tree",
            desc: "Bears clusters of shimmering, translucent Blue Bubbles.",
            x: 1775,
            y: 375,
            w: 88,
            h: 145,
            verbs: [
              { id: "harvest_bubble", label: "Harvest Bubbles", energy: -4, xp: 11, item: "bubble", count: 2 },
              { id: "water_tree", label: "Water", energy: -3, xp: 8, mood: 2 },
              { id: "pet_tree", label: "Pet", energy: -2, xp: 6, mood: 3 },
            ],
          },
          {
            id: "tower_project",
            type: "tower",
            name: "Tower Project",
            desc: "A cooperative wooden scaffolding project rising toward Cosma's clouds.",
            x: 1995,
            y: 375,
            w: 135,
            h: 155,
            progress: 31.4,
            verbs: [
              { id: "contribute_tower", label: "Contribute Work (-8 Energy, +25 iMG)", energy: -8, xp: 25, mood: 6 },
              { id: "inspect_tower", label: "Inspect Blueprints", xp: 3 },
            ],
          },
        ],
        critters: [
          { id: "c_home_chick", type: "chicken", name: "Plump Chicken", x: 1090, y: 375, minX: 980, maxX: 1320, dir: 1, vx: 28 },
          { id: "c_home_bfly", type: "butterfly", name: "Azure Butterfly", x: 560, y: 295, baseY: 295, minX: 430, maxX: 880, dir: 1, vx: 38 },
        ],
        orbs: [
          { id: "o1", x: 695, y: 300, kind: "xp", amount: 5 },
          { id: "o2", x: 750, y: 215, kind: "mood", amount: 4 },
          { id: "o3", x: 755, y: 135, kind: "currants", amount: 6 },
          { id: "o4", x: 520, y: 225, kind: "energy", amount: 5 },
          { id: "o5", x: 1030, y: 245, kind: "xp", amount: 5 },
          { id: "o6", x: 1220, y: 180, kind: "currants", amount: 5 },
          { id: "o7", x: 1590, y: 195, kind: "xp", amount: 6 },
          { id: "o8", x: 1775, y: 145, kind: "mood", amount: 5 },
        ],
      },

      chego_chase: {
        id: "chego_chase",
        name: "Chego Chase",
        region: "Andra",
        width: 1900,
        groundY: 375,
        theme: "andra",
        spawnX: 520,
        platforms: [
          // Stepped Stone Pyramid ledges (Ministry of Departments)
          { x: 130, y: 310, w: 250, label: "Pyramid First Tier" },
          { x: 165, y: 245, w: 180, label: "Pyramid Second Tier" },
          { x: 200, y: 180, w: 110, label: "Pyramid Apex" },
          // Gnarled Savannah Tree branches
          { x: 850, y: 280, w: 140, label: "Acacia Branch" },
          { x: 960, y: 215, w: 130, label: "High Acacia Canopy" },
          // Rocky Cliff Ledge on the right
          { x: 1340, y: 295, w: 220, label: "Savannah Outcrop" },
          { x: 1520, y: 230, w: 190, label: "High Mesa Ledge" },
        ],
        nodes: [
          {
            id: "ministry_pyramid",
            type: "pyramid_door",
            name: "Bureau of Administrative Affairs",
            desc: "Ministry of Departments. Enter for official qualifications and water cooler gossip.",
            x: 255,
            y: 375,
            w: 220,
            h: 195,
            verbs: [
              { id: "enter_hall", label: "Enter Bureaucratic Hall", target: "andra_hall" },
              { id: "read_plaque", label: "Read Brass Plaque (+3 XP)", xp: 3 },
            ],
          },
          {
            id: "sign_chego_home",
            type: "signpost",
            name: "Signpost to Lavu Lane & Home",
            desc: "Points back toward Beau's Home Street.",
            x: 440,
            y: 375,
            w: 55,
            h: 82,
            verbs: [{ id: "go_home", label: "Return to Beau's Home Street", target: "home_street" }],
          },
          {
            id: "shrine_grendaline",
            type: "shrine",
            giant: "Grendaline",
            name: "Shrine to Grendaline",
            desc: "A carved grey stone basin cradled by lush grass in the dry savannah.",
            x: 690,
            y: 375,
            w: 84,
            h: 105,
            verbs: [
              { id: "donate_favor", label: "Donate 15 Currants (+15 Favor & Blessing)", currants: -15, favor: 15, xp: 25, mood: 10 },
              { id: "commune", label: "Commune with Grendaline (+6 Mood)", mood: 6, xp: 8 },
            ],
          },
          {
            id: "chego_gnarled_tree",
            type: "wood_tree_tall",
            name: "Savannah Spice Tree",
            desc: "A gnarled brown savannah tree with wide climbable boughs.",
            x: 920,
            y: 375,
            w: 95,
            h: 160,
            verbs: [
              { id: "water_tree", label: "Water", energy: -3, xp: 10, mood: 3 },
              { id: "pet_tree", label: "Pet", energy: -2, xp: 7, mood: 3 },
              { id: "harvest_plank", label: "Gather Bark Plank", energy: -4, xp: 9, item: "plank", count: 1 },
            ],
          },
          {
            id: "chego_dirt_pile",
            type: "dirt_pile",
            name: "Savannah Dirt Pile",
            desc: "A tempting mound of ochre soil waiting for a Shovel.",
            x: 1430,
            y: 295,
            w: 68,
            h: 36,
            verbs: [
              { id: "dig_dirt", label: "Dig with Shovel (-6 Energy)", energy: -6, xp: 12, item: "earth", count: 2 },
              { id: "pat_dirt", label: "Pat Fondly (+2 Mood)", mood: 2, xp: 3 },
            ],
          },
          {
            id: "sign_chego_bongul",
            type: "signpost",
            name: "Signpost to Bongul Beat",
            desc: "Points deeper into the Andra savannah.",
            x: 1760,
            y: 375,
            w: 55,
            h: 82,
            verbs: [{ id: "go_bongul", label: "Go to Bongul Beat (Andra)", target: "bongul_beat" }],
          },
        ],
        critters: [
          { id: "c_chego_bfly1", type: "butterfly", name: "Cerulean Butterfly", x: 780, y: 290, baseY: 290, minX: 600, maxX: 1120, dir: 1, vx: 42 },
          { id: "c_chego_bfly2", type: "butterfly", name: "Sunspot Butterfly", x: 1250, y: 275, baseY: 275, minX: 1050, maxX: 1550, dir: -1, vx: 36 },
        ],
        orbs: [
          { id: "cc1", x: 255, y: 140, kind: "xp", amount: 8 },
          { id: "cc2", x: 920, y: 240, kind: "mood", amount: 5 },
          { id: "cc3", x: 1020, y: 175, kind: "currants", amount: 7 },
          { id: "cc4", x: 1450, y: 255, kind: "energy", amount: 6 },
          { id: "cc5", x: 1610, y: 190, kind: "xp", amount: 8 },
        ],
      },

      andra_hall: {
        id: "andra_hall",
        name: "Andra Bureaucratic Hall",
        region: "Ministry of Departments",
        width: 1280,
        groundY: 375,
        theme: "interior",
        spawnX: 200,
        platforms: [
          { x: 340, y: 300, w: 150, label: "Reception Desk" },
          { x: 840, y: 290, w: 260, label: "Filing Cabinet Top" },
        ],
        nodes: [
          {
            id: "hall_exit_door",
            type: "door",
            name: "Exit to Chego Chase",
            desc: "Revolving brass doors leading back into the Andra sunshine.",
            x: 120,
            y: 375,
            w: 76,
            h: 135,
            verbs: [{ id: "exit_chego", label: "Exit to Chego Chase", target: "chego_chase" }],
          },
          {
            id: "director_wigglesbottom",
            type: "bureaucrat",
            name: "Director Wigglesbottom",
            desc: "A stern green frog bureaucrat guarding the front desk.",
            x: 410,
            y: 375,
            w: 58,
            h: 74,
            speech: "Take a seat in the orange Waiting Area for 10 seconds before approaching the Magister!",
            verbs: [
              { id: "talk_director", label: "Inquire About Procedure", xp: 6, mood: 2 },
              { id: "compliment_tie", label: "Compliment Necktie (+4 Mood)", mood: 4, xp: 4 },
            ],
          },
          {
            id: "water_cooler",
            type: "water_cooler",
            name: "Water Cooler",
            desc: "Obtain a tiny conical cup of generic office water.",
            x: 545,
            y: 375,
            w: 46,
            h: 92,
            verbs: [
              { id: "get_water", label: "Get water from (-2 Energy)", energy: -2, xp: 8, item: "cup_of_water", count: 1 },
              { id: "gossip_cooler", label: "Gossip by Cooler (+5 Mood)", mood: 5, xp: 5 },
            ],
          },
          {
            id: "waiting_chairs",
            type: "waiting_area",
            name: "Designated Waiting Area",
            desc: "Three molded orange plastic chairs. Stand here still for 10s (or click Wait Patiently) to be certified!",
            x: 695,
            y: 375,
            w: 135,
            h: 58,
            verbs: [
              { id: "wait_chair", label: "Wait Patiently in Chair (+15 XP, Certified!)", xp: 15, mood: 4 },
            ],
          },
          {
            id: "magister_piksnikson",
            type: "bureaucrat",
            name: "Magister Piksnikson",
            desc: "Senior Frog Magister of Qualifications and Triplicate Stamps.",
            x: 980,
            y: 375,
            w: 62,
            h: 78,
            speech: "Form 27B/6 in order? Splendid!",
            verbs: [
              { id: "buy_qualification", label: "Buy Card-Carrying Qualification (50 Currants)", currants: -50, xp: 40, mood: 15, item: "qualification", count: 1 },
              { id: "present_paper", label: "Submit Sheet of Paper (+20 Currants, +15 XP)", xp: 15, currants: 20 },
            ],
          },
        ],
        critters: [],
        orbs: [
          { id: "ah1", x: 410, y: 255, kind: "xp", amount: 5 },
          { id: "ah2", x: 910, y: 245, kind: "currants", amount: 8 },
          { id: "ah3", x: 1020, y: 245, kind: "mood", amount: 6 },
        ],
      },

      bongul_beat: {
        id: "bongul_beat",
        name: "Bongul Beat",
        region: "Andra",
        width: 1950,
        groundY: 375,
        theme: "andra",
        spawnX: 240,
        platforms: [
          { x: 350, y: 295, w: 190, label: "Low Savannah Tier" },
          { x: 590, y: 235, w: 180, label: "Mid Savannah Tier" },
          { x: 840, y: 180, w: 170, label: "High Sun Ledge" },
          { x: 1220, y: 275, w: 180, label: "Spirit Outcrop" },
        ],
        nodes: [
          {
            id: "sign_bongul_chego",
            type: "signpost",
            name: "Signpost to Chego Chase",
            desc: "Points west toward the Ministry pyramid.",
            x: 130,
            y: 375,
            w: 55,
            h: 82,
            verbs: [{ id: "go_chego", label: "Go to Chego Chase", target: "chego_chase" }],
          },
          {
            id: "bongul_cherry_tree",
            type: "fruit_tree",
            name: "Cherry Tree",
            desc: "A fruit tree thriving in the warm Andra breeze.",
            x: 310,
            y: 375,
            w: 95,
            h: 145,
            verbs: [
              { id: "harvest_cherry", label: "Harvest Cherries", energy: -4, xp: 10, item: "cherry", count: 3 },
              { id: "water_tree", label: "Water", energy: -3, xp: 8, mood: 3 },
              { id: "pet_tree", label: "Pet", energy: -2, xp: 6, mood: 2 },
            ],
          },
          {
            id: "spirit_animal_vendor",
            type: "street_spirit",
            name: "Street Spirit (Animal Goods)",
            desc: "A carved tiki/skull-capped Street Spirit trading lotions, grains, and Cubimals.",
            x: 740,
            y: 375,
            w: 62,
            h: 88,
            speech: "Pssst! Need Butterfly Lotion, Cubimals, or Party Ale?",
            verbs: [
              { id: "browse_vendor", label: "Browse Goods (Buy / Sell)" },
              { id: "chat_spirit", label: "Ask About Giants (+5 XP)", xp: 5, mood: 2 },
            ],
          },
          {
            id: "bongul_dirt_1",
            type: "dirt_pile",
            name: "Rich Dirt Pile",
            desc: "Freshly turned savannah earth.",
            x: 1060,
            y: 375,
            w: 68,
            h: 36,
            verbs: [
              { id: "dig_dirt", label: "Dig (-6 Energy)", energy: -6, xp: 12, item: "earth", count: 2 },
              { id: "search_beans", label: "Sift for Beans (-4 Energy)", energy: -4, xp: 9, item: "bean", count: 3 },
            ],
          },
          {
            id: "shrine_humbaba",
            type: "shrine",
            giant: "Humbaba",
            name: "Shrine to Humbaba",
            desc: "A horned stone altar honoring the Giant of Beasts and Walkers.",
            x: 1510,
            y: 375,
            w: 86,
            h: 108,
            verbs: [
              { id: "donate_favor", label: "Donate 15 Currants (+15 Favor & Blessing)", currants: -15, favor: 15, xp: 25, mood: 10 },
              { id: "commune", label: "Honor Humbaba (+6 Mood)", mood: 6, xp: 8 },
            ],
          },
          {
            id: "sign_bongul_goli",
            type: "signpost",
            name: "Signpost to Goli Grabs (Kalavana)",
            desc: "Points down into the earthy caverns of Kalavana.",
            x: 1810,
            y: 375,
            w: 55,
            h: 82,
            verbs: [{ id: "go_goli", label: "Go to Goli Grabs (Kalavana)", target: "goli_grabs" }],
          },
        ],
        critters: [
          { id: "c_bb_chick1", type: "chicken", name: "Savannah Chicken", x: 520, y: 375, minX: 380, maxX: 700, dir: 1, vx: 32 },
          { id: "c_bb_chick2", type: "chicken", name: "Speckled Chicken", x: 1180, y: 375, minX: 980, maxX: 1420, dir: -1, vx: 29 },
          { id: "c_bb_piggy", type: "piggy", name: "Rosy Piggy", x: 920, y: 375, minX: 780, maxX: 1120, dir: 1, vx: 24 },
          { id: "c_bb_bfly", type: "butterfly", name: "Monarch Butterfly", x: 660, y: 190, baseY: 190, minX: 500, maxX: 960, dir: 1, vx: 40 },
        ],
        orbs: [
          { id: "bb1", x: 440, y: 255, kind: "xp", amount: 5 },
          { id: "bb2", x: 680, y: 195, kind: "currants", amount: 6 },
          { id: "bb3", x: 920, y: 140, kind: "mood", amount: 6 },
          { id: "bb4", x: 1310, y: 235, kind: "energy", amount: 6 },
        ],
      },

      goli_grabs: {
        id: "goli_grabs",
        name: "Goli Grabs",
        region: "Kalavana",
        width: 1850,
        groundY: 375,
        theme: "kalavana",
        spawnX: 260,
        platforms: [
          { x: 320, y: 285, w: 190, label: "Cavern Shelf" },
          { x: 580, y: 215, w: 380, label: "Kalavana Overhead Bridge" },
          { x: 1060, y: 280, w: 200, label: "Crystal Ledge" },
          { x: 1360, y: 225, w: 190, label: "High Stalagmite" },
        ],
        nodes: [
          {
            id: "sign_goli_bongul",
            type: "signpost",
            name: "Signpost to Bongul Beat",
            desc: "Climbs back toward the sunlit plains of Andra.",
            x: 130,
            y: 375,
            w: 55,
            h: 82,
            verbs: [{ id: "go_bongul", label: "Go to Bongul Beat (Andra)", target: "bongul_beat" }],
          },
          {
            id: "goli_beryl_1",
            type: "beryl_rock",
            name: "Deep Beryl Vein",
            desc: "A rich crystal formation pulsing with Kalavana resonance.",
            x: 430,
            y: 375,
            w: 82,
            h: 72,
            chunks: 5,
            maxChunks: 5,
            verbs: [
              { id: "mine", label: "Mine (-7 Energy)", energy: -7, xp: 12, item: "beryl", count: 2 },
              { id: "help_mine", label: "Help mine (Co-op Bonus)", energy: -5, xp: 16, item: "beryl", count: 3 },
            ],
          },
          {
            id: "goli_cauldron",
            type: "cauldron",
            name: "Simmering Cauldron",
            desc: "A cast-iron cauldron bubbling with spiced pumpkin and berry aroma.",
            x: 760,
            y: 375,
            w: 78,
            h: 74,
            verbs: [
              { id: "brew_ale", label: "Brew Pumpkin Ale (-5 Energy)", energy: -5, xp: 15, item: "pumpkin_ale", count: 1 },
              { id: "stir_stew", label: "Taste Warm Broth (+20 Energy, +8 Mood)", energy: 20, mood: 8, xp: 10 },
            ],
          },
          {
            id: "kitchen_vendor",
            type: "street_spirit",
            name: "Kitchen Tools & Party Vendor",
            desc: "A cavern Street Spirit offering spices, tonics, and musical contraptions.",
            x: 980,
            y: 375,
            w: 62,
            h: 88,
            speech: "Cauldrons hot! Sparkle Powder fresh! Step right up!",
            verbs: [{ id: "browse_vendor", label: "Browse Goods (Buy / Sell)" }],
          },
          {
            id: "shrine_lem",
            type: "shrine",
            giant: "Lem",
            name: "Shrine to Lem",
            desc: "An ancient compass-carved stone dedicated to Lem, Giant of Directions.",
            x: 1290,
            y: 375,
            w: 86,
            h: 108,
            verbs: [
              { id: "donate_favor", label: "Donate 15 Currants (+15 Favor & Blessing)", currants: -15, favor: 15, xp: 25, mood: 10 },
              { id: "commune", label: "Seek Direction (+6 Mood)", mood: 6, xp: 8 },
            ],
          },
          {
            id: "sign_goli_home",
            type: "signpost",
            name: "Signpost to Beau's Home Street",
            desc: "Shortcut tunnel leading straight back to Beau's Home Street.",
            x: 1690,
            y: 375,
            w: 55,
            h: 82,
            verbs: [{ id: "go_home", label: "Go to Beau's Home Street", target: "home_street" }],
          },
        ],
        critters: [
          { id: "c_gg_piggy", type: "piggy", name: "Truffle Piggy", x: 640, y: 375, minX: 500, maxX: 920, dir: 1, vx: 25 },
          { id: "c_gg_bfly", type: "butterfly", name: "Glowwing Butterfly", x: 1150, y: 220, baseY: 220, minX: 980, maxX: 1420, dir: -1, vx: 38 },
        ],
        orbs: [
          { id: "gg1", x: 670, y: 175, kind: "xp", amount: 6 },
          { id: "gg2", x: 770, y: 175, kind: "currants", amount: 8 },
          { id: "gg3", x: 870, y: 175, kind: "mood", amount: 6 },
          { id: "gg4", x: 1450, y: 185, kind: "energy", amount: 8 },
        ],
      },
    };
  }

  // Render street background, parallax layers, platforms, nodes, critters, and orbs
  function renderStreet(ctx, street, camX, vw, vh, time, hoveredId, placedFurniture) {
    const theme = street.theme || "lost_woods";

    // 1. Sky / Backdrop Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, vh);
    if (theme === "lost_woods") {
      grad.addColorStop(0, "#1c2b29");
      grad.addColorStop(0.55, "#2b3e39");
      grad.addColorStop(1, "#121a18");
    } else if (theme === "vam_road") {
      grad.addColorStop(0, "#a6d4eb");
      grad.addColorStop(0.55, "#d8eef8");
      grad.addColorStop(1, "#eef6fa");
    } else if (theme === "andra") {
      grad.addColorStop(0, "#d4e6b5");
      grad.addColorStop(0.5, "#e9efc8");
      grad.addColorStop(1, "#c8bc78");
    } else if (theme === "kalavana") {
      grad.addColorStop(0, "#1e162b");
      grad.addColorStop(0.55, "#332445");
      grad.addColorStop(1, "#1c1424");
    } else {
      // interior Andra Bureaucratic Hall (#d8d5b9 walls)
      grad.addColorStop(0, "#e2dfc5");
      grad.addColorStop(0.75, "#d8d5b9");
      grad.addColorStop(1, "#c7c29d");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);

    // 2. Distant Parallax Layer (0.2x)
    ctx.save();
    ctx.translate(-camX * 0.2, 0);
    if (theme === "lost_woods") {
      // Drifting mist shafts & spooky distant forest silhouettes
      for (let i = 0; i < 14; i++) {
        const mx = i * 160 + Math.sin(time * 0.3 + i) * 18;
        const mGrad = ctx.createLinearGradient(mx, 0, mx + 45, 360);
        mGrad.addColorStop(0, "rgba(180, 210, 200, 0.09)");
        mGrad.addColorStop(1, "rgba(180, 210, 200, 0)");
        ctx.fillStyle = mGrad;
        ctx.fillRect(mx, 0, 48, 360);
      }
      ctx.fillStyle = "#192623";
      for (let i = 0; i < 18; i++) {
        const tx = i * 130;
        ctx.fillRect(tx, 60, 24, 320);
        ctx.beginPath();
        ctx.arc(tx + 12, 70, 48, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme === "vam_road") {
      // Snowy Vam Road: distant dark blue-green lake on left, snow-covered pine hills on right
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.ellipse(120 + i * 240, 80 + (i % 2) * 20, 75, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Distant lake
      ctx.fillStyle = "#2b6578";
      ctx.fillRect(0, 245, 720, 90);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      for (let i = 0; i < 10; i++) ctx.fillRect(40 + i * 65, 265 + (i % 3) * 14, 38, 3);
      // Distant snowy hills & white pine forest
      ctx.fillStyle = "#e3eff5";
      ctx.beginPath();
      ctx.moveTo(480, 340);
      ctx.quadraticCurveTo(850, 160, 1300, 290);
      ctx.quadraticCurveTo(1600, 170, 2100, 340);
      ctx.closePath();
      ctx.fill();
    } else if (theme === "andra") {
      // Flat sage-green distant hills (#8f9962)
      ctx.fillStyle = "#9aa46c";
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.ellipse(i * 340 + 120, 310, 240, 95, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme === "kalavana") {
      // Cavern ceiling stalactites & glowing crystals
      ctx.fillStyle = "#160f21";
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 110, 0);
        ctx.lineTo(i * 110 + 35, 95 + (i % 3) * 35);
        ctx.lineTo(i * 110 + 70, 0);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    // 3. Midground Parallax Layer (0.5x)
    ctx.save();
    ctx.translate(-camX * 0.5, 0);
    if (theme === "lost_woods") {
      // Twisted dark leafless tree silhouettes
      ctx.fillStyle = "#0d1412";
      for (let i = 0; i < 16; i++) {
        const tx = i * 165 + 40;
        ctx.fillRect(tx, 90, 18, 290);
        ctx.strokeStyle = "#0d1412";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(tx + 9, 170);
        ctx.quadraticCurveTo(tx - 35, 135, tx - 55, 110);
        ctx.moveTo(tx + 9, 145);
        ctx.quadraticCurveTo(tx + 45, 115, tx + 68, 95);
        ctx.stroke();
      }
    } else if (theme === "vam_road") {
      // Snowy pine trees & jagged grey/taupe boulders (A 32:06-32:41)
      for (let i = 0; i < 15; i++) {
        const px = 260 + i * 135;
        ctx.fillStyle = "#4d7c5d";
        ctx.beginPath();
        ctx.moveTo(px, 165);
        ctx.lineTo(px - 32, 330);
        ctx.lineTo(px + 32, 330);
        ctx.closePath();
        ctx.fill();
        // Snow cap
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(px, 162);
        ctx.lineTo(px - 22, 245);
        ctx.lineTo(px + 22, 245);
        ctx.closePath();
        ctx.fill();
      }
      // Jagged grey/taupe rocks in snowfield
      ctx.fillStyle = "#8c877e";
      for (let i = 0; i < 9; i++) {
        const rx = 120 + i * 210;
        ctx.beginPath();
        ctx.moveTo(rx, 365);
        ctx.lineTo(rx + 22, 315);
        ctx.lineTo(rx + 48, 332);
        ctx.lineTo(rx + 68, 302);
        ctx.lineTo(rx + 95, 365);
        ctx.closePath();
        ctx.fill();
      }
    } else if (theme === "andra") {
      // Olive-green grassy midground hills (#6d7438)
      ctx.fillStyle = "#6d7438";
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.ellipse(i * 290 + 80, 365, 195, 82, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme === "kalavana") {
      ctx.fillStyle = "#261a36";
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.ellipse(i * 250 + 90, 375, 150, 95, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme === "interior") {
      // Office interior wall trim, framed posters, cubicles
      ctx.setTransform(1, 0, 0, 1, -camX, 0);
      ctx.fillStyle = "#b8b393";
      ctx.fillRect(0, 340, street.width, 35);
      for (let i = 0; i < 6; i++) {
        const wx = 220 + i * 185;
        ctx.fillStyle = "#a39e7e";
        ctx.fillRect(wx, 120, 95, 68);
        ctx.fillStyle = "#ece9d8";
        ctx.fillRect(wx + 6, 126, 83, 56);
        // Little bureaucratic chart lines
        ctx.fillStyle = "#5da037";
        ctx.fillRect(wx + 16, 155, 14, 20);
        ctx.fillStyle = "#5ca7d8";
        ctx.fillRect(wx + 38, 142, 14, 33);
        ctx.fillStyle = "#ef6c00";
        ctx.fillRect(wx + 60, 134, 14, 41);
      }
    }
    ctx.restore();

    // 4. World Space (1.0x camera)
    ctx.save();
    ctx.translate(-camX, 0);

    // Main Ground Plane
    const gy = street.groundY;
    if (theme === "lost_woods") {
      // Pitch-black foreground ground plane (A 00:00-04:59)
      ctx.fillStyle = "#080b0a";
      ctx.fillRect(0, gy, street.width, vh - gy + 60);
      ctx.strokeStyle = "#22332e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(street.width, gy);
      ctx.stroke();
    } else if (theme === "vam_road") {
      // Olive-green grass with irregular white snow patches (A 32:06)
      ctx.fillStyle = "#5f7a38";
      ctx.fillRect(0, gy, street.width, vh - gy + 60);
      ctx.fillStyle = "#f4f9fc";
      for (let x = 20; x < street.width; x += 115) {
        ctx.beginPath();
        ctx.ellipse(x + 40, gy + 12, 48, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme === "andra") {
      // Tan/ochre savannah dirt ground (#b89f5d) with olive grass edge
      ctx.fillStyle = "#6d7438";
      ctx.fillRect(0, gy - 8, street.width, 14);
      ctx.fillStyle = "#b89f5d";
      ctx.fillRect(0, gy, street.width, vh - gy + 60);
      // Sparse tufts of dry grass
      ctx.strokeStyle = "#8a7c38";
      ctx.lineWidth = 2;
      for (let x = 50; x < street.width; x += 90) {
        ctx.beginPath();
        ctx.moveTo(x, gy + 4);
        ctx.lineTo(x - 5, gy - 8);
        ctx.moveTo(x + 4, gy + 4);
        ctx.lineTo(x + 8, gy - 9);
        ctx.stroke();
      }
    } else if (theme === "kalavana") {
      ctx.fillStyle = "#3b2838";
      ctx.fillRect(0, gy, street.width, vh - gy + 60);
      ctx.fillStyle = "#563b52";
      ctx.fillRect(0, gy - 5, street.width, 8);
    } else {
      // Interior floor (#c7c29d)
      ctx.fillStyle = "#c7c29d";
      ctx.fillRect(0, gy, street.width, vh - gy + 60);
      ctx.strokeStyle = "#9e9976";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(street.width, gy);
      ctx.stroke();
    }

    // Draw Climbable Platforms (tree branches, rocky ledges, pyramid tiers, bridge)
    for (const plat of street.platforms) {
      if (street.id === "home_street" && plat.x >= 640 && plat.x <= 880) {
        // House of Whimsy ledges are drawn as part of the house itself
        continue;
      }
      if (theme === "lost_woods" || theme === "vam_road") {
        ctx.fillStyle = theme === "vam_road" ? "#6d5843" : "#1c1917";
        drawRoundedRect(ctx, plat.x, plat.y, plat.w, 12, 6);
        ctx.fill();
        if (theme === "vam_road") {
          ctx.fillStyle = "#ffffff";
          drawRoundedRect(ctx, plat.x + 4, plat.y - 3, plat.w - 8, 5, 3);
          ctx.fill();
        } else {
          ctx.strokeStyle = "#3e524b";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else if (theme === "andra") {
        ctx.fillStyle = "#8d7440";
        drawRoundedRect(ctx, plat.x, plat.y, plat.w, 16, 7);
        ctx.fill();
        ctx.fillStyle = "#6d7438";
        drawRoundedRect(ctx, plat.x + 2, plat.y - 3, plat.w - 4, 6, 3);
        ctx.fill();
      } else if (theme === "kalavana") {
        ctx.fillStyle = "#5d4037";
        drawRoundedRect(ctx, plat.x, plat.y, plat.w, 14, 5);
        ctx.fill();
        ctx.strokeStyle = "#8d6e63";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = "#8d8868";
        drawRoundedRect(ctx, plat.x, plat.y, plat.w, 10, 4);
        ctx.fill();
      }
    }

    // Draw Placed Furniture on Home Street
    if (street.id === "home_street" && Array.isArray(placedFurniture)) {
      for (const f of placedFurniture) {
        ctx.save();
        ctx.translate(f.x, gy);
        if (f.id === "lantern") {
          ctx.strokeStyle = "#4e342e";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -48);
          ctx.stroke();
          ctx.fillStyle = "#ff8a65";
          ctx.beginPath();
          ctx.arc(0, -52, 11, 0, Math.PI * 2);
          ctx.fill();
        } else if (f.id === "gnome") {
          ctx.fillStyle = "#1565c0";
          ctx.fillRect(-8, -22, 16, 22);
          ctx.fillStyle = "#f7d7c4";
          ctx.beginPath();
          ctx.arc(0, -26, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e53935";
          ctx.beginPath();
          ctx.moveTo(-9, -30);
          ctx.lineTo(0, -48);
          ctx.lineTo(9, -30);
          ctx.closePath();
          ctx.fill();
        } else if (f.id === "fountain") {
          ctx.fillStyle = "#90a4ae";
          drawRoundedRect(ctx, -24, -18, 48, 18, 6);
          ctx.fill();
          ctx.fillStyle = "#4dd0e1";
          ctx.beginPath();
          ctx.arc(Math.sin(time * 3) * 8, -28 - (time * 15) % 18, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#5d4037";
          ctx.fillRect(-4, -16, 8, 16);
          ctx.fillStyle = "#66bb6a";
          ctx.beginPath();
          ctx.arc(0, -28, 14, 0, Math.PI * 2);
          ctx.arc(0, -44, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Draw Interactive Nodes
    for (const node of street.nodes) {
      const isHovered = hoveredId === node.id;
      ctx.save();
      ctx.translate(node.x, node.y);

      if (isHovered) {
        ctx.shadowColor = "#4cc3d9";
        ctx.shadowBlur = 18;
      }

      drawNodeVisual(ctx, node, time, isHovered);

      // Active mining/harvesting progress wheel on node
      if (node.activeTimer && node.activeTimer > 0) {
        const pct = Math.min(1, 1 - node.activeTimer / (node.activeDuration || 1.5));
        ctx.fillStyle = "#5da037";
        ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(node.activeLabel || "working", -10, 22);
        ctx.strokeStyle = "#5da037";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(28, 18, 7, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
        ctx.stroke();
      }

      // Periodic NPC speech bubble (shown when recently spoken to or when player is nearby)
      if (node.speech && node.showSpeech) {
        ctx.shadowBlur = 0;
        ctx.font = "600 11px 'Trebuchet MS', sans-serif";
        const text = String(node.speech).slice(0, 56);
        const tw = Math.min(240, ctx.measureText(text).width + 18);
        const by = -node.h - 28;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.strokeStyle = "#4cc3d9";
        ctx.lineWidth = 1.4;
        drawRoundedRect(ctx, -tw / 2, by, tw, 22, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1c2833";
        ctx.textAlign = "center";
        ctx.fillText(text, 0, by + 15);
      }

      ctx.restore();
    }

    // Draw Roaming Critters (Chickens, Butterflies, Piggies)
    for (const c of street.critters) {
      const isHovered = hoveredId === c.id;
      ctx.save();
      ctx.translate(c.x, c.y);
      if (isHovered) {
        ctx.shadowColor = "#4cc3d9";
        ctx.shadowBlur = 16;
      }
      ctx.scale(c.dir || 1, 1);

      if (c.type === "chicken") {
        const hop = Math.abs(Math.sin(time * 8 + c.x * 0.05)) * -3;
        ctx.translate(0, hop);
        // Legs
        ctx.strokeStyle = "#f57f17";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-3, -6);
        ctx.lineTo(-4, 0);
        ctx.moveTo(3, -6);
        ctx.lineTo(4, 0);
        ctx.stroke();
        // Plump white body
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#546e7a";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, -14, 13, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Red comb & beak
        ctx.fillStyle = "#e53935";
        ctx.beginPath();
        ctx.arc(6, -24, 3.5, 0, Math.PI * 2);
        ctx.arc(2, -25, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffb300";
        ctx.beginPath();
        ctx.moveTo(12, -16);
        ctx.lineTo(18, -14);
        ctx.lineTo(12, -11);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = "#1c2833";
        ctx.beginPath();
        ctx.arc(8, -16, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.type === "butterfly") {
        const flap = Math.abs(Math.sin(time * 14)) * 0.7 + 0.3;
        ctx.fillStyle = "#29b6f6";
        ctx.strokeStyle = "#0277bd";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(-5, -4, 9 * flap, 12, -0.3, 0, Math.PI * 2);
        ctx.ellipse(5, -4, 9 * flap, 12, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff176";
        ctx.beginPath();
        ctx.arc(-5, -6, 2.5 * flap, 0, Math.PI * 2);
        ctx.arc(5, -6, 2.5 * flap, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#263238";
        ctx.fillRect(-1.5, -11, 3, 14);
      } else if (c.type === "piggy") {
        const waddle = Math.sin(time * 7) * 1.5;
        ctx.translate(0, -Math.abs(waddle));
        ctx.fillStyle = "#f48fb1";
        ctx.strokeStyle = "#ad1457";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, -13, 16, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Snout
        ctx.fillStyle = "#f06292";
        ctx.beginPath();
        ctx.ellipse(15, -12, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#263238";
        ctx.beginPath();
        ctx.arc(10, -16, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw Floating Stat Orbs (Rule 26: +1 XP, +1 currants, +1 mood, +1 energy)
    for (const orb of street.orbs) {
      if (orb.collectedTimer && orb.collectedTimer > 0) continue;
      const oy = orb.y + Math.sin(time * 3.2 + orb.x * 0.03) * 6;
      ctx.save();
      ctx.translate(orb.x, oy);
      const colors = {
        xp: { main: "#4dd0e1", glow: "rgba(77, 208, 225, 0.45)", label: "XP" },
        currants: { main: "#ffd54f", glow: "rgba(255, 213, 79, 0.45)", label: "C" },
        mood: { main: "#81c784", glow: "rgba(129, 199, 132, 0.45)", label: "M" },
        energy: { main: "#aed581", glow: "rgba(174, 213, 129, 0.45)", label: "E" },
      };
      const st = colors[orb.kind] || colors.xp;
      ctx.fillStyle = st.glow;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.main;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1c2833";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(st.label, 0, 3);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawNodeVisual(ctx, node, time, isHovered) {
    const strokeCol = isHovered ? "#4cc3d9" : "rgba(0,0,0,0.45)";
    const lw = isHovered ? 2.5 : 1.5;

    if (node.type === "house") {
      // "House of Whimsy" (A 03:24 / A 04:56): crooked multi-story teal/blue-green house with purple trim
      ctx.save();
      // Left chimney
      ctx.fillStyle = "#6a4c6b";
      ctx.fillRect(-75, -195, 22, 70);
      // Smoke puffs
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.arc(-64 + Math.sin(time * 2) * 6, -210 - (time * 12) % 25, 9, 0, Math.PI * 2);
      ctx.fill();

      // First story body (slightly crooked)
      ctx.fillStyle = "#2b7a78";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-88, 0);
      ctx.lineTo(-94, -120);
      ctx.lineTo(94, -115);
      ctx.lineTo(86, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Purple/pinkish-brown trim band
      ctx.fillStyle = "#7b4b6a";
      ctx.fillRect(-96, -124, 192, 12);

      // Second story body
      ctx.fillStyle = "#348c88";
      ctx.beginPath();
      ctx.moveTo(-78, -120);
      ctx.lineTo(-68, -195);
      ctx.lineTo(74, -190);
      ctx.lineTo(80, -120);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Curved whimsical roof
      ctx.fillStyle = "#5e3c58";
      ctx.beginPath();
      ctx.moveTo(-86, -190);
      ctx.quadraticCurveTo(0, -238, 88, -188);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing yellow-orange arched front doorway & 4 brown wooden steps
      ctx.fillStyle = "#6d4c41";
      for (let s = 0; s < 4; s++) {
        ctx.fillRect(-68 - s * 6, -8 - (3 - s) * 8, 52 + s * 8, 8);
      }
      ctx.fillStyle = "#ffb74d";
      ctx.strokeStyle = "#5d4037";
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, -56, -88, 38, 58, 18);
      ctx.fill();
      ctx.stroke();

      // Warm glowing circular and arched windows (separate paths so no connecting wedge!)
      const winPositions = [
        { x: 32, y: -65, r: 16 },
        { x: -22, y: -155, r: 14 },
        { x: 34, y: -155, r: 14 },
      ];
      for (const wp of winPositions) {
        ctx.fillStyle = "#ffe082";
        ctx.strokeStyle = "#5d4037";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Window crossbars
        ctx.strokeStyle = "rgba(93, 64, 55, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(wp.x - wp.r, wp.y);
        ctx.lineTo(wp.x + wp.r, wp.y);
        ctx.moveTo(wp.x, wp.y - wp.r);
        ctx.lineTo(wp.x, wp.y + wp.r);
        ctx.stroke();
      }
      ctx.restore();
    } else if (node.type === "beryl_rock") {
      // Jagged glowing cyan/mint-green crystal rock formation (A 08:25)
      ctx.fillStyle = "#26c6da";
      ctx.strokeStyle = isHovered ? "#ffffff" : "#00838f";
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(-28, -44);
      ctx.lineTo(-10, -32);
      ctx.lineTo(2, -66);
      ctx.lineTo(18, -38);
      ctx.lineTo(30, -54);
      ctx.lineTo(38, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Inner mint crystal facets
      ctx.fillStyle = "#a7ffeb";
      ctx.beginPath();
      ctx.moveTo(-14, -8);
      ctx.lineTo(2, -54);
      ctx.lineTo(12, -12);
      ctx.closePath();
      ctx.fill();
    } else if (node.type === "magic_rock") {
      // Pedestal + grey rounded rectangular stone with expressive face (A 01:51)
      ctx.fillStyle = "#546e7a";
      ctx.fillRect(-20, -14, 40, 14);
      ctx.fillStyle = "#90a4ae";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      drawRoundedRect(ctx, -18, -50, 36, 38, 10);
      ctx.fill();
      ctx.stroke();
      // Eyes & talking mouth
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-6, -35, 4, 0, Math.PI * 2);
      ctx.arc(6, -35, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c2833";
      ctx.beginPath();
      ctx.arc(-5, -35, 2, 0, Math.PI * 2);
      ctx.arc(7, -35, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-6, -24, 12, 3);
    } else if (node.type === "butler") {
      // Butler Roy: small grey-skinned humanoid with white hair and dark suit (A 00:00 / 03:23)
      const jig = Math.sin(time * 5) * 1.5;
      ctx.translate(0, -Math.abs(jig));
      ctx.fillStyle = "#263238";
      drawRoundedRect(ctx, -9, -32, 18, 24, 5);
      ctx.fill();
      // White shirt V & bow tie
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-4, -32);
      ctx.lineTo(4, -32);
      ctx.lineTo(0, -22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c62828";
      ctx.fillRect(-4, -31, 8, 3);
      // Grey head & white hair
      ctx.fillStyle = "#b0bec5";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      drawRoundedRect(ctx, -13, -56, 26, 24, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#eceff1";
      ctx.beginPath();
      ctx.ellipse(0, -56, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c2833";
      ctx.beginPath();
      ctx.arc(-4, -45, 2, 0, Math.PI * 2);
      ctx.arc(5, -45, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (node.type === "paper_tree") {
      // Paper Tree (A 01:43-01:45): pale pink trunk + fan-like curled branches with crisp paper sheets
      ctx.fillStyle = "#e1bee7";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.quadraticCurveTo(-5, -55, -3, -95);
      ctx.lineTo(5, -95);
      ctx.quadraticCurveTo(7, -55, 9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Fan-like curl branches
      const curls = [
        { x: -30, y: -95, r: 14 },
        { x: -16, y: -116, r: 16 },
        { x: 4, y: -122, r: 16 },
        { x: 24, y: -112, r: 15 },
        { x: 32, y: -92, r: 13 },
      ];
      for (const c of curls) {
        ctx.strokeStyle = "#ce93d8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -82);
        ctx.quadraticCurveTo(c.x * 0.6, c.y + 15, c.x, c.y);
        ctx.stroke();
        // Paper leaves (white & pale blue crisp sheets)
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#90caf9";
        ctx.lineWidth = 1.2;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(Math.sin(time * 2 + c.x) * 0.12);
        ctx.fillRect(-8, -10, 14, 18);
        ctx.strokeRect(-8, -10, 14, 18);
        ctx.fillStyle = "#bbdefb";
        ctx.fillRect(-5, -6, 8, 2);
        ctx.fillRect(-5, -1, 8, 2);
        ctx.restore();
      }
    } else if (node.type === "fruit_tree" || node.type === "bubble_tree") {
      // Trunk & forked boughs
      ctx.fillStyle = "#6d4c41";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(-7, -88);
      ctx.lineTo(7, -88);
      ctx.lineTo(11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Multi-puff Canopy (separate circles so no internal stroke lines)
      const canopyCol = node.type === "fruit_tree" ? "#f48fb1" : "#81d4fa";
      const puffs = [
        { x: -26, y: -90, r: 26 },
        { x: 26, y: -90, r: 26 },
        { x: 0, y: -108, r: 34 },
      ];
      for (const pf of puffs) {
        ctx.fillStyle = canopyCol;
        ctx.beginPath();
        ctx.arc(pf.x, pf.y, pf.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Fruit / Bubbles on canopy
      for (let i = -2; i <= 2; i++) {
        const fx = i * 14;
        const fy = -96 + (Math.abs(i) % 2) * 14;
        if (node.type === "fruit_tree") {
          ctx.fillStyle = "#c62828";
          ctx.beginPath();
          ctx.arc(fx, fy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffcdd2";
          ctx.beginPath();
          ctx.arc(fx - 1.5, fy - 1.5, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "rgba(79, 195, 247, 0.85)";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(fx, fy, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    } else if (node.type === "wood_tree" || node.type === "wood_tree_tall") {
      // Bare tan wooden-plank trees (A 02:18-02:35)
      const h = node.type === "wood_tree_tall" ? 145 : 105;
      ctx.fillStyle = "#b88655";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.fillRect(-9, -h, 18, h);
      ctx.strokeRect(-9, -h, 18, h);
      const branches = node.type === "wood_tree_tall" ? 4 : 3;
      for (let b = 1; b <= branches; b++) {
        const by = -b * 32;
        const dir = b % 2 === 0 ? 1 : -1;
        ctx.fillStyle = "#c99764";
        ctx.fillRect(dir > 0 ? 6 : -38, by, 32, 9);
        ctx.strokeRect(dir > 0 ? 6 : -38, by, 32, 9);
      }
    } else if (node.type === "tower") {
      // Wooden scaffolding Tower construction project (A 02:33 / 03:49)
      ctx.strokeStyle = "#8d6e63";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-48, 0);
      ctx.lineTo(-36, -135);
      ctx.moveTo(48, 0);
      ctx.lineTo(36, -135);
      ctx.stroke();
      ctx.fillStyle = "#a1887f";
      for (let lv = 1; lv <= 4; lv++) {
        ctx.fillRect(-46, -lv * 30, 92, 8);
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Tower ${(node.progress || 31.4).toFixed(1)}%`, 0, -142);
    } else if (node.type === "signpost") {
      ctx.fillStyle = "#5d4037";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.fillRect(-5, -75, 10, 75);
      // Two directional arrow boards
      ctx.fillStyle = "#8d6e63";
      ctx.beginPath();
      ctx.moveTo(-26, -66);
      ctx.lineTo(22, -66);
      ctx.lineTo(30, -57);
      ctx.lineTo(22, -48);
      ctx.lineTo(-26, -48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(24, -42);
      ctx.lineTo(-22, -42);
      ctx.lineTo(-30, -33);
      ctx.lineTo(-22, -24);
      ctx.lineTo(24, -24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (node.type === "pyramid_door") {
      // Stepped stone pyramid building (Bureau of Administrative Affairs, B 00:06-03:33)
      ctx.fillStyle = "#9e9778";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.fillRect(-115, -65, 230, 65);
      ctx.strokeRect(-115, -65, 230, 65);
      ctx.fillRect(-85, -130, 170, 65);
      ctx.strokeRect(-85, -130, 170, 65);
      ctx.fillRect(-52, -195, 104, 65);
      ctx.strokeRect(-52, -195, 104, 65);
      // Grand Doorway
      ctx.fillStyle = "#3e2723";
      drawRoundedRect(ctx, -26, -62, 52, 62, 8);
      ctx.fill();
      ctx.fillStyle = "#ffd54f";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MINISTRY OF DEPARTMENTS", 0, -72);
    } else if (node.type === "shrine") {
      // Stone Shrine basin on green grass patch (B 00:53 / B 02:57)
      ctx.fillStyle = "#5da037";
      ctx.beginPath();
      ctx.ellipse(0, 0, 46, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#78909c";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.fillRect(-24, -55, 48, 55);
      ctx.strokeRect(-24, -55, 48, 55);
      ctx.beginPath();
      ctx.arc(0, -68, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#a7ffeb";
      ctx.beginPath();
      ctx.arc(0, -68, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (node.type === "dirt_pile") {
      ctx.fillStyle = "#6d4c41";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-34, 0);
      ctx.quadraticCurveTo(0, -42, 34, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (node.type === "street_spirit") {
      // Tiki/Skull-like brown Street Spirit vendor (B 05:48)
      ctx.fillStyle = "#795548";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      drawRoundedRect(ctx, -18, -52, 36, 52, 10);
      ctx.fill();
      ctx.stroke();
      // Carved skull/tiki mask crest
      ctx.fillStyle = "#d7ccc8";
      drawRoundedRect(ctx, -20, -78, 40, 32, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#263238";
      ctx.beginPath();
      ctx.arc(-7, -64, 4, 0, Math.PI * 2);
      ctx.arc(7, -64, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (node.type === "water_cooler") {
      // Office Water Cooler (B 03:51)
      ctx.fillStyle = "#eceff1";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.fillRect(-14, -50, 28, 50);
      ctx.strokeRect(-14, -50, 28, 50);
      ctx.fillStyle = "#4fc3f7";
      drawRoundedRect(ctx, -12, -84, 24, 34, 8);
      ctx.fill();
      ctx.stroke();
    } else if (node.type === "waiting_area") {
      // Orange plastic waiting-room chairs (B 04:30)
      for (let i = -1; i <= 1; i++) {
        const cx = i * 38;
        ctx.fillStyle = "#ef6c00";
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = lw;
        drawRoundedRect(ctx, cx - 13, -38, 26, 20, 5);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#546e7a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 10, -18);
        ctx.lineTo(cx - 12, 0);
        ctx.moveTo(cx + 10, -18);
        ctx.lineTo(cx + 12, 0);
        ctx.stroke();
      }
    } else if (node.type === "bureaucrat") {
      // Frog bureaucrat NPC behind desk (B 04:30-05:25)
      ctx.fillStyle = "#455a64";
      ctx.fillRect(-28, -32, 56, 32);
      ctx.fillStyle = "#66bb6a";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(0, -52, 18, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Bulging frog eyes & spectacles
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-8, -64, 6, 0, Math.PI * 2);
      ctx.arc(8, -64, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1c2833";
      ctx.beginPath();
      ctx.arc(-8, -64, 2.5, 0, Math.PI * 2);
      ctx.arc(8, -64, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (node.type === "door") {
      ctx.fillStyle = "#6d4c41";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      drawRoundedRect(ctx, -28, -110, 56, 110, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.arc(16, -52, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (node.type === "cauldron") {
      ctx.fillStyle = "#263238";
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(0, -28, 30, 0, Math.PI);
      ctx.lineTo(30, -48);
      ctx.lineTo(-30, -48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ef6c00";
      ctx.beginPath();
      ctx.ellipse(0, -48, 28, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  window.StreetsSys = {
    createStreets,
    renderStreet,
  };
})();
