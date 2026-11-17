export const DEMO_USER = {
  username: 'alex',
  password: 'demo123',
  email: 'demo@evergreenpaws.com',
  name: 'Alex Rivera',
  gender: 'boy',
};

export const SPECIES_LIST = [
  { id: 'Dog', label: 'Dog', emoji: '🐕' },
  { id: 'Cat', label: 'Cat', emoji: '🐈' },
  { id: 'Hamster', label: 'Hamster', emoji: '🐹' },
  { id: 'Guinea Pig', label: 'Guinea Pig', emoji: '🐾' },
  { id: 'Rabbit', label: 'Rabbit', emoji: '🐇' },
  { id: 'Bird', label: 'Bird', emoji: '🦜' },
  { id: 'Ferret', label: 'Ferret', emoji: '🦡' },
  { id: 'Chinchilla', label: 'Chinchilla', emoji: '🐭' },
  { id: 'Turtle', label: 'Turtle', emoji: '🐢' },
  { id: 'Reptile', label: 'Reptile', emoji: '🦎' },
  { id: 'Snake', label: 'Snake', emoji: '🐍' },
  { id: 'Iguana', label: 'Iguana', emoji: '🦎' },
  { id: 'Crocodile', label: 'Crocodile', emoji: '🐊' },
  { id: 'Fish', label: 'Fish', emoji: '🐠' },
  { id: 'Hedgehog', label: 'Hedgehog', emoji: '🦔' },
  { id: 'Sugar Glider', label: 'Sugar Glider', emoji: '🐿️' },
  { id: 'Otter', label: 'Otter', emoji: '🦦' },
  { id: 'Rat', label: 'Rat', emoji: '🐀' },
  { id: 'Goose', label: 'Goose', emoji: '🪿' },
  { id: 'Chicken', label: 'Chicken', emoji: '🐔' },
  { id: 'Pig', label: 'Pig', emoji: '🐖' },
  { id: 'Goat', label: 'Goat', emoji: '🐐' },
  { id: 'Cow', label: 'Cow', emoji: '🐄' },
  { id: 'Horse', label: 'Horse', emoji: '🐎' },
  { id: 'Elephant', label: 'Elephant', emoji: '🐘' },
  { id: 'Small Pet', label: 'Small Pet', emoji: '🐾' },
  { id: 'Medium Pet', label: 'Medium Pet', emoji: '🐾' },
  { id: 'Large Pet', label: 'Large Pet', emoji: '🐾' },
];

export function getSpeciesEmoji(species) {
  return SPECIES_LIST.find((s) => s.id === species)?.emoji || '🐾';
}

export const AVATAR_STYLES = [
  { id: 'classic', label: 'Classic Cloak' },
  { id: 'uniform', label: 'Keeper Uniform' },
  { id: 'cape', label: 'Starlight Cape' },
  { id: 'kimono', label: 'Serenity Haori' },
  { id: 'formal', label: 'Formal Coat' },
];

export const HAIR_STYLES = [
  { id: 'long', label: 'Long Flowing' },
  { id: 'bob', label: 'Classic Bob' },
  { id: 'ponytail', label: 'Ponytail / Bun' },
  { id: 'twin', label: 'Twin Braids' },
  { id: 'short', label: 'Short Swept' },
  { id: 'curly', label: 'Soft Curly' },
];

export const CLOAK_OPTIONS = [
  { id: 'sage', label: 'Forest Sage', color: '#4a7c59' },
  { id: 'lavender', label: 'Lavender Dusk', color: '#7c6a9a' },
  { id: 'amber', label: 'Warm Amber', color: '#c87d4b' },
  { id: 'starlight', label: 'Starlight Navy', color: '#3b5978' },
  { id: 'rose', label: 'Rose Quartz', color: '#b86578' },
  { id: 'ivory', label: 'Ivory Cream', color: '#c9bca6' },
  { id: 'slate', label: 'Royal Slate', color: '#36454f' },
  { id: 'teal', label: 'Emerald Teal', color: '#2d7a78' },
];

export const HAIR_OPTIONS = [
  { id: 'espresso', label: 'Espresso', color: '#2c221e' },
  { id: 'chestnut', label: 'Chestnut', color: '#8d4a32' },
  { id: 'honey', label: 'Honey Blonde', color: '#d8c098' },
  { id: 'silver', label: 'Silver Mist', color: '#e2e8f0' },
  { id: 'midnight', label: 'Midnight Blue', color: '#243b55' },
  { id: 'sakura', label: 'Sakura Pink', color: '#e88ca5' },
  { id: 'auburn', label: 'Auburn Red', color: '#9e3b24' },
];

export const MONUMENT_STYLES = {
  tombstone: [
    {
      id: 'classic-granite',
      name: 'Classic Granite Arch',
      subtitle: 'Timeless carved slate & silver trim',
      accent: '#94a3b8',
    },
    {
      id: 'angel-wings',
      name: 'Guardian Meadow Stone',
      subtitle: 'Warm ivory limestone with halo crest',
      accent: '#e2d9c8',
    },
    {
      id: 'rose-heart',
      name: 'Rose Quartz Heart',
      subtitle: 'Blush marble sculpted heart monument',
      accent: '#f4b6c2',
    },
    {
      id: 'moss-celtic',
      name: 'Ancient Moss Sanctuary',
      subtitle: 'Forest stone veiled in soft clover',
      accent: '#7ca982',
    },
  ],
  'ash-room': [
    {
      id: 'celadon-urn',
      name: 'Celadon Jade Porcelain Urn',
      subtitle: 'Hand-glazed sage ceramic & brass collar',
      accent: '#8db49c',
    },
    {
      id: 'gilded-lotus',
      name: 'Gilded Lotus Sanctuary Urn',
      subtitle: 'Burnished bronze with lotus lid',
      accent: '#d4a853',
    },
    {
      id: 'starlight-glass',
      name: 'Starlight Crystal Reliquary',
      subtitle: 'Luminous frosted sapphire glass vessel',
      accent: '#89b4fa',
    },
    {
      id: 'warm-cherrywood',
      name: 'Artisan Cherrywood Casket',
      subtitle: 'Hand-rubbed timber keepsake box',
      accent: '#b67352',
    },
  ],
};

export const OFFERING_TYPES = {
  candle: {
    id: 'candle',
    category: 'candle',
    emoji: '🕯️',
    label: 'Eternal Vigil Candle',
    blessing: 'lit a warm vigil candle',
  },
  incense: {
    id: 'incense',
    category: 'incense',
    emoji: '🪔',
    label: 'Sandalwood Peace Incense',
    blessing: 'lit sandalwood peace incense',
  },
  flowers: [
    {
      id: 'white-lily',
      category: 'flower',
      emoji: '🌸',
      label: 'White Lily Bouquet',
      blessing: 'laid a White Lily Bouquet',
    },
    {
      id: 'sunflower',
      category: 'flower',
      emoji: '🌼',
      label: 'Sunflowers',
      blessing: 'placed bright Sunflowers',
    },
    {
      id: 'cherry-blossom',
      category: 'flower',
      emoji: '🌺',
      label: 'Cherry Blossom Branch',
      blessing: 'placed a Cherry Blossom Branch',
    },
    {
      id: 'forget-me-not',
      category: 'flower',
      emoji: '💐',
      label: 'Forget-Me-Nots',
      blessing: 'laid a bouquet of Forget-Me-Nots',
    },
  ],
  treats: [
    {
      id: 'golden-biscuit',
      category: 'treat',
      emoji: '🦴',
      label: 'Golden Biscuit',
      blessing: 'offered a Golden Biscuit',
    },
    {
      id: 'salmon-treat',
      category: 'treat',
      emoji: '🐟',
      label: 'Salmon Delicacy',
      blessing: 'offered a Salmon Delicacy',
    },
    {
      id: 'meadow-carrot',
      category: 'treat',
      emoji: '🥕',
      label: 'Sweet Meadow Carrot',
      blessing: 'offered a Sweet Meadow Carrot',
    },
    {
      id: 'plush-star',
      category: 'treat',
      emoji: '🧸',
      label: 'Plush Star Toy',
      blessing: 'placed a Plush Star Toy',
    },
  ],
};

export const PHOTO_PRESETS = [
  {
    id: 'golden',
    label: 'Golden Retriever',
    species: 'Dog',
    url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'scottish-fold',
    label: 'Scottish Fold Cat',
    species: 'Cat',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'husky',
    label: 'Siberian Husky',
    species: 'Dog',
    url: 'https://images.unsplash.com/photo-1547407139-3c921a66005c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'bunny',
    label: 'Holland Lop Bunny',
    species: 'Rabbit',
    url: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'tuxedo-cat',
    label: 'Tuxedo Cat',
    species: 'Cat',
    url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'shiba',
    label: 'Shiba Inu',
    species: 'Dog',
    url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
  },
];

export const INITIAL_MEMORIALS = [
  {
    id: 'mem-barnaby',
    name: 'Barnaby',
    species: 'Dog',
    breed: 'Golden Retriever',
    space: 'tombstone',
    styleId: 'classic-granite',
    locationCode: 'Plot G-1',
    zoneName: 'Whispering Meadow',
    birthDate: '2011-04-12',
    passedDate: '2025-09-18',
    ownerUsername: 'alex',
    ownerEmail: 'demo@evergreenpaws.com',
    ownerName: 'Alex Rivera',
    visibility: 'public',
    photo: PHOTO_PRESETS[0].url,
    epitaph: 'Forever chasing golden sunbeams across endless green fields.',
    story:
      'Barnaby greeted every morning with two muddy tennis balls and a tail that thumped like a heartbeat against the floorboards. He walked us through fourteen seasons, slept beneath the porch swing during summer storms, and never met a stranger who was not instantly his best friend.',
    favoriteTreat: 'Peanut Butter Golden Biscuit',
    traits: ['Gentle Soul', 'Ball Chaser', 'Porch Guardian'],
    candlesCount: 28,
    incenseCount: 11,
    flowersCount: 19,
    treatsCount: 14,
    activeOfferings: ['🕯️', '🌸', '🌼', '🦴'],
    memories: [
      {
        id: 'm1',
        photo: PHOTO_PRESETS[0].url,
        caption: 'Autumn afternoon walk along the lake trail.',
        date: '2024-10-14',
      },
      {
        id: 'm2',
        photo: 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&w=800&q=80',
        caption: 'Running by the shoreline at sunrise.',
        date: '2023-07-02',
      },
    ],
    offeringsLog: [
      {
        id: 'o1',
        emoji: '🕯️',
        label: 'Eternal Vigil Candle',
        visitor: 'Maya Lin',
        time: '2h ago',
      },
      {
        id: 'o2',
        emoji: '🦴',
        label: 'Golden Biscuit',
        visitor: 'Alex Rivera',
        time: 'Yesterday',
      },
      {
        id: 'o3',
        emoji: '🌸',
        label: 'White Lily Bouquet',
        visitor: 'Elena & Milo',
        time: '3d ago',
      },
    ],
    tributes: [
      {
        id: 't1',
        author: 'Maya Lin',
        message: 'Still remember Barnaby greeting everyone at the park gate with his favorite plush duck. Rest easy, sweet boy.',
        date: '2 days ago',
      },
      {
        id: 't2',
        author: 'Alex Rivera',
        message: 'Visited your meadow stone this evening. The twilight lantern looks warm beside your lilies.',
        date: 'Yesterday',
      },
    ],
  },
  {
    id: 'mem-mochi',
    name: 'Mochi',
    species: 'Cat',
    breed: 'Scottish Fold',
    space: 'ash-room',
    styleId: 'celadon-urn',
    locationCode: 'Niche A-1',
    zoneName: 'Hall of Serenity',
    birthDate: '2013-02-08',
    passedDate: '2026-01-22',
    ownerUsername: 'alex',
    ownerEmail: 'demo@evergreenpaws.com',
    ownerName: 'Alex Rivera',
    visibility: 'public',
    photo: PHOTO_PRESETS[1].url,
    epitaph: 'Curled in warm cedarlight, purring softly through eternity.',
    story:
      'Mochi loved warm laundry fresh from the dryer, afternoon sunsquares on the tatami mat, and slow blinks from across the kitchen counter. Her celadon urn rests in the quietest upper gallery where the morning light catches the brass rim.',
    favoriteTreat: 'Wild Salmon Delicacy',
    traits: ['Window Watcher', 'Purr Engine', 'Velvet Paws'],
    candlesCount: 34,
    incenseCount: 22,
    flowersCount: 16,
    treatsCount: 12,
    activeOfferings: ['🕯️', '🪔', '🌺', '🐟'],
    memories: [
      {
        id: 'm3',
        photo: PHOTO_PRESETS[1].url,
        caption: 'Curled up beside the ceramic teacup every morning.',
        date: '2025-11-03',
      },
    ],
    offeringsLog: [
      {
        id: 'o4',
        emoji: '🪔',
        label: 'Sandalwood Peace Incense',
        visitor: 'Alex Rivera',
        time: '1h ago',
      },
      {
        id: 'o5',
        emoji: '🐟',
        label: 'Salmon Delicacy',
        visitor: 'Sora Takahashi',
        time: '1d ago',
      },
    ],
    tributes: [
      {
        id: 't3',
        author: 'Sora Takahashi',
        message: 'Lighting sandalwood incense for little Mochi tonight. Her folded ears always brought such calm.',
        date: '1 day ago',
      },
    ],
  },
  {
    id: 'mem-koda',
    name: 'Koda',
    species: 'Dog',
    breed: 'Siberian Husky',
    space: 'tombstone',
    styleId: 'moss-celtic',
    locationCode: 'Plot G-2',
    zoneName: 'Pinecrest Slope',
    birthDate: '2012-11-19',
    passedDate: '2025-12-04',
    ownerUsername: 'elena',
    ownerEmail: 'elena.hart@example.com',
    ownerName: 'Elena Hart',
    visibility: 'public',
    photo: PHOTO_PRESETS[2].url,
    epitaph: 'Your howl still echoes gently in the northern pines.',
    story:
      'Koda lived for the first frost of November and mountain ridge hikes. He had a dramatic opinion about dinner time and the softest amber eyes when resting his chin on your knee after a long trail.',
    favoriteTreat: 'Frozen Salmon & Pumpkin Bites',
    traits: ['Snow Runner', 'Chatty Woo-Woo', 'Trailblazer'],
    candlesCount: 21,
    incenseCount: 9,
    flowersCount: 15,
    treatsCount: 8,
    activeOfferings: ['🕯️', '💐', '🧸'],
    memories: [
      {
        id: 'm4',
        photo: PHOTO_PRESETS[2].url,
        caption: 'Watching snowfall from the mountain cabin.',
        date: '2024-12-12',
      },
    ],
    offeringsLog: [
      {
        id: 'o6',
        emoji: '💐',
        label: 'Forget-Me-Nots',
        visitor: 'Daniel Park',
        time: '5h ago',
      },
    ],
    tributes: [
      {
        id: 't4',
        author: 'Daniel Park',
        message: 'Run free through endless powder, Koda.',
        date: '5 hours ago',
      },
    ],
  },
  {
    id: 'mem-clover',
    name: 'Clover',
    species: 'Rabbit',
    breed: 'Holland Lop',
    space: 'tombstone',
    styleId: 'rose-heart',
    locationCode: 'Plot G-1',
    zoneName: 'Sunlit Clover Patch',
    birthDate: '2018-03-21',
    passedDate: '2026-02-14',
    ownerUsername: 'claire',
    ownerEmail: 'claire.bennett@example.com',
    ownerName: 'Claire Bennett',
    visibility: 'public',
    photo: PHOTO_PRESETS[3].url,
    epitaph: 'Small paws, gentle binkies, and a heart full of spring.',
    story:
      'Clover spent every evening doing happy binkies across the living room rug and nudging ankles for fresh cilantro. Her rose quartz heart stone rests right beside the lavender border.',
    favoriteTreat: 'Sweet Meadow Carrot',
    traits: ['Binky Champion', 'Clover Nibbler', 'Velvet Ears'],
    candlesCount: 17,
    incenseCount: 6,
    flowersCount: 24,
    treatsCount: 19,
    activeOfferings: ['🕯️', '🌸', '🌼', '🥕'],
    memories: [
      {
        id: 'm5',
        photo: PHOTO_PRESETS[3].url,
        caption: 'Exploring the dandelion garden on a sunny Sunday.',
        date: '2025-05-11',
      },
    ],
    offeringsLog: [
      {
        id: 'o7',
        emoji: '🥕',
        label: 'Sweet Meadow Carrot',
        visitor: 'Alex Rivera',
        time: '6h ago',
      },
    ],
    tributes: [
      {
        id: 't5',
        author: 'Claire Bennett',
        message: 'Brought fresh chamomile and carrots to your clover patch today, sweetheart.',
        date: '1 day ago',
      },
    ],
  },
  {
    id: 'mem-luna',
    name: 'Luna',
    species: 'Cat',
    breed: 'Tuxedo Shorthair',
    space: 'ash-room',
    styleId: 'starlight-glass',
    locationCode: 'Niche A-2',
    zoneName: 'Moonlight Gallery',
    birthDate: '2010-08-30',
    passedDate: '2025-11-11',
    ownerUsername: 'sora',
    ownerEmail: 'sora.t@example.com',
    ownerName: 'Sora Takahashi',
    visibility: 'public',
    photo: PHOTO_PRESETS[4].url,
    epitaph: 'Among quiet stars, our midnight companion keeps watch.',
    story:
      'For fifteen years Luna sat beside the desk lamp during late-night study sessions and kept everyone warm through winter. Her crystal reliquary glows softly under the amber alcove light.',
    favoriteTreat: 'Bonito Flake Delicacy',
    traits: ['Midnight Muse', 'Desk Supervisor', 'Starlight Whiskers'],
    candlesCount: 41,
    incenseCount: 27,
    flowersCount: 22,
    treatsCount: 15,
    activeOfferings: ['🕯️', '🪔', '🌺', '🐟'],
    memories: [
      {
        id: 'm6',
        photo: PHOTO_PRESETS[4].url,
        caption: 'Guarding the bookshelf at midnight.',
        date: '2024-09-09',
      },
    ],
    offeringsLog: [
      {
        id: 'o8',
        emoji: '🕯️',
        label: 'Eternal Vigil Candle',
        visitor: 'Claire Bennett',
        time: '3h ago',
      },
    ],
    tributes: [
      {
        id: 't6',
        author: 'Elena Hart',
        message: 'Her starlight glass niche is so peaceful at night. Sending love, Sora.',
        date: '3 days ago',
      },
    ],
  },
  {
    id: 'mem-yuzu',
    name: 'Yuzu',
    species: 'Dog',
    breed: 'Shiba Inu',
    space: 'ash-room',
    styleId: 'gilded-lotus',
    locationCode: 'Niche A-1',
    zoneName: 'Cedar Alcove',
    birthDate: '2014-05-03',
    passedDate: '2026-03-09',
    ownerUsername: 'kenji',
    ownerEmail: 'kenji.m@example.com',
    ownerName: 'Kenji Mori',
    visibility: 'public',
    photo: PHOTO_PRESETS[5].url,
    epitaph: 'Proud little fox heart, forever smiling in warm cedar light.',
    story:
      'Yuzu greeted every walk like a royal parade and curled into a perfect cinnamon roll by the hearth each night. His gilded lotus urn sits beside warm cherry blossoms and his favorite star plush.',
    favoriteTreat: 'Roasted Sweet Potato Biscuit',
    traits: ['Shiba Smile', 'Cinnamon Curl', 'Sunbeam Napper'],
    candlesCount: 25,
    incenseCount: 18,
    flowersCount: 21,
    treatsCount: 16,
    activeOfferings: ['🕯️', '🪔', '🌸', '🧸'],
    memories: [
      {
        id: 'm7',
        photo: PHOTO_PRESETS[5].url,
        caption: 'Smiling beneath the spring cherry trees.',
        date: '2025-04-04',
      },
    ],
    offeringsLog: [
      {
        id: 'o9',
        emoji: '🌺',
        label: 'Cherry Blossom Branch',
        visitor: 'Maya Lin',
        time: '4h ago',
      },
    ],
    tributes: [
      {
        id: 't7',
        author: 'Kenji Mori',
        message: 'Thank you to everyone leaving cherry blossoms for Yuzu.',
        date: '6 hours ago',
      },
    ],
  },
];

const STARTER_ORDER = {
  'mem-barnaby': 1,
  'mem-mochi': 2,
  'mem-koda': 3,
  'mem-clover': 4,
  'mem-luna': 5,
  'mem-yuzu': 6,
};

function parsePlotNumber(code) {
  const m = String(code || '').match(/(\d+)\s*$/);
  return m ? Math.max(1, parseInt(m[1], 10)) : null;
}

function formatSequentialCode(space, num) {
  return space === 'ash-room' ? `Niche A-${num}` : `Plot G-${num}`;
}

export function normalizeAndDeduplicateMemorials(memorials) {
  if (!Array.isArray(memorials)) return INITIAL_MEMORIALS;

  const valid = memorials.filter((m) => m && typeof m === 'object' && m.id);
  if (valid.length === 0) return INITIAL_MEMORIALS;

  const sorted = valid
    .slice()
    .sort((a, b) => {
      const sa = STARTER_ORDER[a.id] || 9999;
      const sb = STARTER_ORDER[b.id] || 9999;
      if (sa !== sb) return sa - sb;
      const ca = a.createdAt || 0;
      const cb = b.createdAt || 0;
      if (ca !== cb) return ca - cb;
      return String(a.id).localeCompare(String(b.id));
    });

  const usedPerBucket = new Map();
  const updatedById = new Map();

  for (const m of sorted) {
    const sp = m.species || 'Dog';
    const space = m.space === 'ash-room' ? 'ash-room' : 'tombstone';
    const bucketKey = `${sp}__${space}`;
    if (!usedPerBucket.has(bucketKey)) {
      usedPerBucket.set(bucketKey, new Set());
    }
    const used = usedPerBucket.get(bucketKey);

    let num = parsePlotNumber(m.locationCode);
    if (!num) {
      num = 1;
    }
    while (used.has(num)) {
      num += 1;
    }
    used.add(num);

    const nextCode = formatSequentialCode(space, num);
    const normalized = {
      ...m,
      name: String(m.name || 'Beloved Pet'),
      species: sp,
      space,
      locationCode: nextCode,
      activeOfferings: Array.isArray(m.activeOfferings) ? m.activeOfferings : [],
      tributes: Array.isArray(m.tributes) ? m.tributes : [],
      memories: Array.isArray(m.memories) ? m.memories : [],
      offeringsLog: Array.isArray(m.offeringsLog) ? m.offeringsLog : [],
      traits: Array.isArray(m.traits) ? m.traits : [],
    };
    updatedById.set(m.id, normalized);
  }

  return valid.map((m) => updatedById.get(m.id) || m);
}

export function getNextPlotCode(memorials, species, space) {
  const targetSpecies = species || 'Dog';
  const targetSpace = space === 'ash-room' ? 'ash-room' : 'tombstone';
  const used = new Set();

  (memorials || []).forEach((m) => {
    if ((m.species || 'Dog') === targetSpecies && (m.space === 'ash-room' ? 'ash-room' : 'tombstone') === targetSpace) {
      const n = parsePlotNumber(m.locationCode);
      if (n) used.add(n);
    }
  });

  let nextNum = 1;
  while (used.has(nextNum)) {
    nextNum += 1;
  }
  return formatSequentialCode(targetSpace, nextNum);
}

export const GARDEN_NPCS_DATA = [
  {
    id: 'npc-maya',
    name: 'Maya Lin',
    cloak: '#6b8e78',
    hair: '#221d1b',
    x2d: 440,
    y2d: 410,
    patrol2d: 34,
    speed2d: 0.45,
    x3d: -125,
    z3d: 15,
    patrol3d: 32,
    speed3d: 0.65,
    sitting: false,
    quotes: [
      'The reflections on the pond are so peaceful.',
      'The lanterns look so gentle over the pond tonight.',
      'Sometimes the ripples on the water move even without wind—perhaps an unseen paw brushing the shore from the afterlife.',
      'Life is a brief lantern we hold together; beyond the silver mist, their gentle spirit still remembers the warmth of your hand.',
      'May sorrow settle softly like evening dew. What you loved so truly can never really be lost.',
    ],
  },
  {
    id: 'npc-kenji',
    name: 'Elder Kenji',
    cloak: '#7b6450',
    hair: '#dfe5ec',
    x2d: 785,
    y2d: 385,
    patrol2d: 0,
    speed2d: 0,
    x3d: 165,
    z3d: 75,
    patrol3d: 0,
    speed3d: 0,
    sitting: true,
    quotes: [
      'They wait for us in the sunbeams...',
      'Between waking life and the afterlife lies only a thin veil; listen closely at dusk and you may hear quiet footsteps beside you.',
      'A loyal companion never fades into nothingness—they simply step ahead into a sunlit meadow where time has no weight.',
      'Grief is only the shadow cast by deep devotion. Be kind to your aching heart; their spirit rests beyond all sorrow.',
      'Those who taught us how to love without conditions keep a lantern burning for us until we meet again.',
    ],
  },
  {
    id: 'npc-hana',
    name: 'Keeper Hana',
    cloak: '#a47551',
    hair: '#3b2b24',
    x2d: 600,
    y2d: 255,
    patrol2d: 50,
    speed2d: 0.35,
    x3d: -60,
    z3d: -215,
    patrol3d: 40,
    speed3d: 0.45,
    sitting: false,
    quotes: [
      'Walk through the archway ahead to enter the Ash Room.',
      'Step inside the archway ahead to visit the Ash Room.',
      'Folks say lantern smoke drifting through the archway carries whispered promises straight across the border of the afterlife.',
      'In this life they walked faithfully at our heels; in the next, they watch gently over the paths we still must tread.',
      'My deepest condolences for your loss. Even in heavy silence, every candle you light reaches across the distance between worlds.',
    ],
  },
];

export const ASH_NPCS_DATA = [
  {
    id: 'npc-sora',
    name: 'Sora',
    cloak: '#5b7294',
    hair: '#1f232b',
    x2d: 470,
    y2d: 430,
    patrol2d: 0,
    speed2d: 0,
    x3d: -110,
    z3d: 40,
    patrol3d: 0,
    speed3d: 0,
    sitting: true,
    quotes: [
      'The sandalwood incense is so calming.',
      'Watch how incense smoke curls upward and dissolves—like a gentle soul slipping quietly from time into eternity.',
      'Though their chapter in this waking world ended too soon, their spirit still knows the sound of your voice in the quiet.',
      'Please take every quiet moment you need here. Tears are simply love that has nowhere else to rest.',
    ],
  },
  {
    id: 'npc-claire',
    name: 'Claire',
    cloak: '#a86b7a',
    hair: '#6e4532',
    x2d: 840,
    y2d: 265,
    patrol2d: 28,
    speed2d: 0.4,
    x3d: 195,
    z3d: -115,
    patrol3d: 28,
    speed3d: 0.5,
    sitting: false,
    quotes: [
      'Every candle keeps a cherished memory glowing.',
      'Bringing fresh blossoms to the alcoves feels peaceful.',
      'At midnight, the glass alcoves seem to hum with soft starlight, as if small spirits gather to admire the flowers left for them.',
      'Death cannot untie a bond woven through lifetime trust; beyond this life, love remains the one language both worlds understand.',
      'I am so sorry for the goodbye you had to whisper. May the warm glow of these alcoves bring comfort to your heart.',
    ],
  },
  {
    id: 'npc-keeper',
    name: 'Sanctuary Keeper',
    cloak: '#856548',
    hair: '#d5dde4',
    x2d: 690,
    y2d: 360,
    patrol2d: 22,
    speed2d: 0.3,
    x3d: 85,
    z3d: 120,
    patrol3d: 24,
    speed3d: 0.35,
    sitting: false,
    quotes: [
      'Every candle keeps a cherished memory glowing.',
      'Ashes hold only the quiet vessel of an earthly journey; what truly lived within them now runs free among silver stars.',
      'Mysterious are the threads between life and the afterlife—sometimes a sudden warm hush indoors feels like a gentle farewell nuzzle.',
      'May peace slowly mend your days, knowing you gave them a lifetime filled with safety, kindness, and devotion.',
    ],
  },
];

export function getUserIdentityKey(user) {
  if (!user || typeof user !== 'object') return '';
  const raw = user.email || user.username || user.id || user.name || '';
  return String(raw).trim().toLowerCase();
}

export function isMemorialOwner(memorial, user) {
  if (!memorial || !user) return false;
  const userKey = getUserIdentityKey(user);
  const ownerEmail = String(memorial.ownerEmail || '').trim().toLowerCase();
  const ownerUsername = String(memorial.ownerUsername || '').trim().toLowerCase();
  if (userKey && ((ownerEmail && ownerEmail === userKey) || (ownerUsername && ownerUsername === userKey))) {
    return true;
  }
  const userName = String(user.name || '').trim().toLowerCase();
  const ownerName = String(memorial.ownerName || '').trim().toLowerCase();
  return Boolean(
    user.username &&
      ownerUsername &&
      String(user.username).trim().toLowerCase() === ownerUsername
  ) || Boolean(userName && ownerName && user.id && memorial.ownerId && user.id === memorial.ownerId && userName === ownerName);
}
