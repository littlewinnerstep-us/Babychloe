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
    locationCode: 'Plot G-21',
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
    locationCode: 'Niche A-21',
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
    locationCode: 'Plot G-22',
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
    locationCode: 'Plot G-21',
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
    locationCode: 'Niche A-22',
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
    locationCode: 'Niche A-21',
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

export const MAX_PLOTS_PER_GARDEN = 200;
export const RESERVED_PLOT_END = 20;

export function parsePlotNumber(code) {
  const m = String(code || '').match(/(\d+)\s*$/);
  return m ? Math.max(1, parseInt(m[1], 10)) : null;
}

export function formatSequentialCode(space, num) {
  return space === 'ash-room' ? `Niche A-${num}` : `Plot G-${num}`;
}

export function getAdminSlotCode(space, num) {
  const safeNum = Math.max(1, Math.min(MAX_PLOTS_PER_GARDEN, Math.round(Number(num) || 1)));
  return formatSequentialCode(space === 'ash-room' ? 'ash-room' : 'tombstone', safeNum);
}

export function getUsedSlotsSet(memorials, species, space) {
  const targetSpecies = species || 'Dog';
  const targetSpace = space === 'ash-room' ? 'ash-room' : 'tombstone';
  const used = new Set();
  (memorials || []).forEach((m) => {
    if (!m || m.deletedAt) return;
    if ((m.species || 'Dog') === targetSpecies && (m.space === 'ash-room' ? 'ash-room' : 'tombstone') === targetSpace) {
      const n = parsePlotNumber(m.locationCode);
      if (n) used.add(n);
    }
  });
  return used;
}

export function normalizeAndDeduplicateMemorials(memorials) {
  if (!Array.isArray(memorials)) return INITIAL_MEMORIALS;

  const valid = memorials.filter((m) => {
    if (!m || typeof m !== 'object' || !m.id) return false;
    const rawNum = parsePlotNumber(m.locationCode);
    if (!m.adminManaged && rawNum && rawNum >= 666 && rawNum <= 668) return false;
    return true;
  });
  if (valid.length === 0) return INITIAL_MEMORIALS;

  const sorted = valid
    .slice()
    .sort((a, b) => {
      const am = a.adminManaged ? 0 : 1;
      const bm = b.adminManaged ? 0 : 1;
      if (am !== bm) return am - bm;
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
    if (m.deletedAt) {
      const safeNum = num && num >= 1 && num <= MAX_PLOTS_PER_GARDEN ? num : RESERVED_PLOT_END + 1;
      updatedById.set(m.id, {
        ...m,
        name: String(m.name || 'Beloved Pet'),
        species: sp,
        space,
        locationCode: formatSequentialCode(space, safeNum),
        visitsCount: Number.isFinite(Number(m.visitsCount)) ? Number(m.visitsCount) : 0,
        activeOfferings: Array.isArray(m.activeOfferings) ? m.activeOfferings : [],
        tributes: Array.isArray(m.tributes) ? m.tributes : [],
        memories: Array.isArray(m.memories) ? m.memories : [],
        offeringsLog: Array.isArray(m.offeringsLog) ? m.offeringsLog : [],
        traits: Array.isArray(m.traits) ? m.traits : [],
      });
      continue;
    }

    // Plots 1-20 are reserved blank for regular visitors unless adminManaged is true
    const minAllowed = m.adminManaged ? 1 : RESERVED_PLOT_END + 1;
    if (!num || num < minAllowed || num > MAX_PLOTS_PER_GARDEN) {
      num = minAllowed;
    }
    while (used.has(num) && num <= MAX_PLOTS_PER_GARDEN) {
      num += 1;
    }
    if (num > MAX_PLOTS_PER_GARDEN) {
      num = minAllowed;
      while (used.has(num)) {
        num += 1;
      }
    }
    used.add(num);

    const nextCode = formatSequentialCode(space, num);
    const normalized = {
      ...m,
      name: String(m.name || 'Beloved Pet'),
      species: sp,
      space,
      locationCode: nextCode,
      visitsCount: Number.isFinite(Number(m.visitsCount)) ? Number(m.visitsCount) : 0,
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

export function getNextPlotCode(memorials, species, space, includeReserved = false) {
  const targetSpecies = species || 'Dog';
  const targetSpace = space === 'ash-room' ? 'ash-room' : 'tombstone';
  const used = getUsedSlotsSet(memorials, targetSpecies, targetSpace);

  let nextNum = includeReserved ? 1 : RESERVED_PLOT_END + 1;
  while (used.has(nextNum) && nextNum <= MAX_PLOTS_PER_GARDEN) {
    nextNum += 1;
  }
  return formatSequentialCode(targetSpace, Math.min(nextNum, MAX_PLOTS_PER_GARDEN));
}

// Rich non-repeating quote pool covering life, afterlife, and condolences for the lost.
export const MEMORIAL_WISDOM_QUOTES = [
  // Life & Devotion (1-35)
  'Life is measured not in the years we are given, but in the quiet mornings and warm sunbeams we shared.',
  'Every pawprint they left in your life became a gentle map pointing back to unconditional love.',
  'In a hurried world, they taught us how to be completely present for a single afternoon walk.',
  'A faithful companion never asks for grand promises—only a warm voice and a place beside your chair.',
  'The smallest heartbeats often leave the deepest echoes across an entire lifetime.',
  'They knew the rhythm of your footsteps before you even reached the door.',
  'Through ordinary Tuesdays and quiet winters, their loyalty turned a house into a sanctuary.',
  'Nothing truly lived with tenderness is ever wasted; every gentle day remains woven into who you are.',
  'Even their sleepiest sigh carried a trust that asked nothing in return.',
  'Life with a beloved pet is a short story written in boundless affection.',
  'They showed us that joy can be as simple as fresh grass, warm sun, and being together.',
  'In every season of your life, they met you with the exact same unwavering kindness.',
  'The love you gave them shaped every single day of their world.',
  'A lifetime of small rituals—morning greetings, shared silences—becomes our dearest treasure.',
  'They never counted the hours, only the moments you came home.',
  'Some souls arrive in fur and feathers just to teach our hearts how to soften.',
  'Even the briefest life shines brightly when it is surrounded by safety and care.',
  'You were their whole universe, and you made that universe gentle.',
  'Every memory of their playful spirit is proof of how deeply they were cherished.',
  'Time moves forward, yet the warmth of a life shared in love never cools.',
  'They taught us patience without a single spoken word.',
  'In the garden of memory, every shared afternoon blooms again when the wind stirs.',
  'To be loved by an animal is to be known without judgment and forgiven without hesitation.',
  'Each gentle habit they had still lingers like sunlight on a quiet windowsill.',
  'Their life may have been shorter than ours, yet it was complete because it was full of love.',
  'A good life is one where a little soul felt safe from its first day to its last.',
  'Even in old age, their eyes still lit up the moment they heard your name.',
  'We carry their lessons of loyalty into every kindness we show the world afterward.',
  'No calendar can measure the worth of a companion who stood by you through every storm.',
  'The quiet joy they brought to ordinary days was a gift beyond measure.',
  'Every gentle touch you offered them was a promise kept.',
  'In remembering how they lived, we honor the brightest part of our own hearts.',
  'Their tiny footsteps crossed your life briefly, yet changed your soul forever.',
  'Love was the only language they ever needed to speak fluently.',
  'What they gave us in life was pure grace wrapped in quiet companionship.',

  // Afterlife & Beyond the Veil (36-70)
  'Beyond the silver mist of this world, they run across meadows where time has no weight.',
  'Between waking life and the afterlife lies only a thin veil; listen at dusk and you may feel them near.',
  'A loyal spirit never fades into nothingness—they simply step ahead into endless morning light.',
  'Beyond the quiet horizon, their weary body is whole again and light as spring air.',
  'Folks say lantern glow and flower scent carry whispered promises straight across the border of the afterlife.',
  'They did not vanish into darkness; they crossed into a sunlit field where no winter ever reaches.',
  'In the afterlife, every good companion rests in warm sunbeams waiting for familiar footsteps.',
  'Death cannot untie a bond woven through lifetime trust; love speaks across both worlds.',
  'Watch how evening mist rises gently from the grass—like a peaceful soul stepping into eternity.',
  'Though their earthly journey ended, their spirit still recognizes the sound of your voice.',
  'Somewhere past the quiet stars, they are chasing warm breezes with effortless grace.',
  'Ashes and stone hold only the vessel; what truly lived within them now runs free in peace.',
  'Mysterious are the threads between life and the afterlife—sometimes a sudden hush feels like a gentle nuzzle.',
  'They wait where the grass stays soft, the water stays clear, and no pain can ever follow.',
  'Even across the unseen shore, the bond between guardian and companion never weakens.',
  'When the breeze turns unexpectedly warm, perhaps they are passing close by to check on you.',
  'In the next world, every loyal heart is greeted with endless shade, cool streams, and rest.',
  'What is born of pure devotion belongs to eternity, not merely to a few fleeting years.',
  'They crossed ahead not to leave you behind, but to rest where sorrow cannot touch them.',
  'At midnight, the quiet sanctuary hums with soft starlight, as if gentle spirits gather among the flowers.',
  'The bridge between this life and the next is built entirely out of remembered love.',
  'No distance between worlds is too wide for a heart that remembers your scent and voice.',
  'In eternity, there are no tired legs, no lonely nights, and no final goodbyes.',
  'Those who taught us how to love without conditions keep a quiet light waiting for us.',
  'Beyond the veil, they still tilt their head at the sound of kindness.',
  'Every blossom placed here sends a quiet greeting across the meadow of the afterlife.',
  'Their spirit stepped lightly out of pain and into a stillness deeper than any sleep.',
  'When two souls belong together, farewell is only a pause across two sides of one road.',
  'Up where the evening sky turns gold, they are resting in the warmest patch of light.',
  'They are safe now in the gentle keeping of eternity, free from every ache.',
  'Time cannot erase a spiritual bond; it only brings us closer to meeting again.',
  'In the quiet beyond, their playful spark shines untouched by age or weariness.',
  'A soul this pure does not end—it simply returns to the peace from which it came.',
  'Look up at the calm night sky; love like theirs always leaves a star behind.',
  'Across the quiet river of time, they rest contentedly until your paths cross once more.',

  // Condolences & Comfort for the Lost (71-105)
  'My deepest condolences for your loss. May sorrow settle softly like evening dew.',
  'I am so sorry for the goodbye you had to whisper. Please take every quiet moment you need here.',
  'Grief is only the shadow cast by deep devotion. Be gentle with your aching heart today.',
  'Tears are simply love that has nowhere else to rest—let them fall without apology.',
  'May peace slowly mend your days, knowing you gave them a lifetime of safety and kindness.',
  'No words can make a quiet home feel full again, yet you are never alone in missing them.',
  'Please accept my heartfelt condolences; the pain you feel honors how deeply you cared.',
  'When the silence at home feels heavy, remember you were the best part of their whole life.',
  'Be patient with your grief—losing a faithful friend leaves a space shaped just like them.',
  'May every gentle memory soften the sharp edge of today’s sorrow.',
  'I am truly sorry for your heartache. Loving them to the very end was the bravest gift of all.',
  'Even in the deepest quiet, every flower you bring speaks of a love that still endures.',
  'You stood by them through their final breath; may that devotion bring you comfort now.',
  'Condolences from one caretaker to another—some goodbyes hurt because the bond was extraordinary.',
  'May the calm of this garden wrap around your shoulders like a warm blanket tonight.',
  'It is okay if your heart still listens for paws on the floor; love takes time to learn stillness.',
  'Wishing you gentle mornings and soft memories as you carry their love forward.',
  'You did not fail them by letting them rest—you spared them pain at the cost of your own heart.',
  'May each breath here feel a little lighter, surrounded by others who understand this loss.',
  'Sending quiet comfort to your weary spirit; what you shared was rare and beautiful.',
  'Let the stillness of these rows hold your sorrow for a little while.',
  'There is no timeline for healing after losing someone who loved you every single day.',
  'May the warmth of remembered sunbeams slowly outweigh the ache of their absence.',
  'My sincerest sympathies—only someone who has loved deeply knows how quiet the house becomes.',
  'Hold onto the knowledge that they fell asleep knowing they were completely cherished.',
  'When grief comes in waves, let this sanctuary be a safe harbor for your heart.',
  'May kindness meet you in every corner as you walk through this season of mourning.',
  'Even through tears, your devotion shines—they were so fortunate to have you.',
  'Take your time along the path; every step taken in remembrance is sacred.',
  'May tomorrow feel a shade gentler than today, carrying their warmth beside you.',
  'I am sorry for the empty spot beside you. Their love remains yours forever.',
  'Let the flowers speak the things your heart is too tired to put into words.',
  'You gave them a gentle life and a peaceful farewell; may your heart find rest in that truth.',
  'Peace be with you in your mourning—their memory is held with honor here.',
  'Whenever you miss them most, know that love of this kind never truly leaves you.',
];

const GARDENER_NAMES = [
  'Gardener Maya', 'Gardener Kenji', 'Gardener Hana', 'Gardener Mateo', 'Gardener Lin',
  'Gardener Rowan', 'Gardener Mei', 'Gardener Theo', 'Gardener Iris', 'Gardener Noah',
  'Gardener Wren', 'Gardener Sora', 'Gardener Arthur', 'Gardener Elena', 'Gardener Leo',
  'Gardener Ivy', 'Gardener Julian', 'Gardener Nao', 'Gardener Clara', 'Gardener Oliver',
  'Gardener Hazel', 'Gardener Ren', 'Gardener Faye', 'Gardener Miles', 'Gardener June',
];

const ASH_KEEPER_NAMES = [
  'Sora', 'Claire', 'Sanctuary Keeper', 'Aiko', 'Julian',
  'Mina', 'Elias', 'Nadia', 'Haruto', 'Celeste',
  'Yuna', 'Gideon', 'Tessa', 'Kaito', 'Miriam',
  'Soren', 'Lydia', 'Daisuke', 'Freya', 'Bram',
  'Kaori', 'Lucian', 'Maeve', 'Riku', 'Sylvie',
];

const GARDENER_CLOAKS = ['#5c7f67', '#6b8e78', '#4f735a', '#76895e', '#657c52', '#52796f', '#748a6d'];
const ASH_CLOAKS = ['#5b7294', '#a86b7a', '#856548', '#6a6f8c', '#7c6477', '#5e7a78', '#8b6f5a'];
const NPC_HAIRS = ['#221d1b', '#dfe5ec', '#3b2b24', '#6e4532', '#1f232b', '#8d6e53', '#c8c4be'];
const GARDENER_TOOLS = ['🪴', '🌿', '🌷', '🧹', '🌼'];

function buildBandNpcs(isGarden) {
  const npcs = [];
  const names = isGarden ? GARDENER_NAMES : ASH_KEEPER_NAMES;
  const cloaks = isGarden ? GARDENER_CLOAKS : ASH_CLOAKS;
  const baseRowY2d = isGarden ? 220 : 200;
  // 5 two-row bands covering rows 0..9, 5 NPCs per band = 25 NPCs
  const slotX2d = [200, 800, 1400, 2000, 2600];
  const slotX3d = [-1360, -680, 0, 680, 1360];

  for (let band = 0; band < 5; band++) {
    const rowA = band * 2;
    const rowB = band * 2 + 1;
    const minY2d = baseRowY2d + rowA * 240 - 38;
    const maxY2d = baseRowY2d + rowB * 240 + 38;
    const minZ3d = -170 + rowA * 250 - 42;
    const maxZ3d = -170 + rowB * 250 + 42;

    for (let slot = 0; slot < 5; slot++) {
      const idx = band * 5 + slot;
      const startRow = (band + slot) % 2 === 0 ? rowA : rowB;
      const y2d = baseRowY2d + startRow * 240 + (slot % 2 === 0 ? 18 : -18);
      const z3d = -170 + startRow * 250 + (slot % 2 === 0 ? 22 : -22);
      // 4 distinct quotes per NPC from the 105-quote pool (no repeats across NPCs in a room)
      const qStart = (idx * 4) % MEMORIAL_WISDOM_QUOTES.length;
      const quotes = [0, 1, 2, 3].map(
        (k) => MEMORIAL_WISDOM_QUOTES[(qStart + k) % MEMORIAL_WISDOM_QUOTES.length]
      );

      npcs.push({
        id: `${isGarden ? 'g-npc' : 'a-npc'}-${idx}`,
        name: names[idx % names.length],
        role: isGarden ? 'gardener' : 'keeper',
        tool: isGarden ? GARDENER_TOOLS[idx % GARDENER_TOOLS.length] : null,
        cloak: cloaks[idx % cloaks.length],
        hair: NPC_HAIRS[(idx * 3 + band) % NPC_HAIRS.length],
        band,
        slot,
        x2d: slotX2d[slot],
        y2d,
        minX2d: 120,
        maxX2d: 2680,
        minY2d,
        maxY2d,
        speed2d: 20 + ((idx * 5) % 12),
        x3d: slotX3d[slot],
        z3d,
        minX3d: -1420,
        maxX3d: 1420,
        minZ3d,
        maxZ3d,
        speed3d: 22 + ((idx * 5) % 12),
        quotes,
      });
    }
  }
  return npcs;
}

export const GARDEN_NPCS_DATA = buildBandNpcs(true);

export const ASH_NPCS_DATA = buildBandNpcs(false);

const PLAYER_POS_STORAGE_KEY = 'evergreen_paws_player_pos_v1';

export function loadSavedPlayerPosition() {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(PLAYER_POS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePlayerPosition({ mode, x, y, facingX = 0, facingZ = 1 }) {
  try {
    if (typeof window === 'undefined' || !Number.isFinite(x) || !Number.isFinite(y)) return;
    let x2d;
    let y2d;
    let x3d;
    let z3d;
    if (mode === '2d') {
      x2d = x;
      y2d = y;
      x3d = (x - 1400) * (1400 / 1260);
      z3d = (y - 220) * (250 / 240) - 170;
    } else {
      x3d = x;
      z3d = y;
      x2d = 1400 + x * (1260 / 1400);
      y2d = 220 + (y + 170) * (240 / 250);
    }
    localStorage.setItem(
      PLAYER_POS_STORAGE_KEY,
      JSON.stringify({ x2d, y2d, x3d, z3d, facingX, facingZ, updatedAt: Date.now() })
    );
  } catch {
    // ignore storage errors
  }
}

const PLOT_COLS_2D = [
  140, 260, 380, 500, 620, 740, 860, 980, 1100, 1220,
  1580, 1700, 1820, 1940, 2060, 2180, 2300, 2420, 2540, 2660,
];
const PLOT_COLS_3D = [
  -1400, -1265, -1130, -995, -860, -725, -590, -455, -320, -185,
  185, 320, 455, 590, 725, 860, 995, 1130, 1265, 1400,
];

/**
 * Prevents characters and NPCs from stepping onto or inside any tomb or niche plot
 * by smoothly sliding them around the plot's anti-collision boundary.
 */
export function resolvePlotCollision(
  x,
  y,
  mode = '2d',
  room = 'tombstone',
  rx = 44,
  ry = 40
) {
  const cols = mode === '3d' ? PLOT_COLS_3D : PLOT_COLS_2D;
  const baseRowY = mode === '3d' ? -170 : room === 'ash-room' ? 200 : 220;
  const rowStep = mode === '3d' ? 250 : 240;

  let nx = x;
  let ny = y;
  const approxRow = Math.max(0, Math.min(9, Math.round((ny - baseRowY) / rowStep)));
  const rStart = Math.max(0, approxRow - 1);
  const rEnd = Math.min(9, approxRow + 1);

  for (let r = rStart; r <= rEnd; r++) {
    const py = baseRowY + r * rowStep;
    if (Math.abs(ny - py) >= ry) continue;
    for (let c = 0; c < cols.length; c++) {
      const px = cols[c];
      const dx = nx - px;
      if (Math.abs(dx) >= rx) continue;
      const dy = ny - py;
      const ex = dx / rx;
      const ey = dy / ry;
      const d = Math.hypot(ex, ey);
      if (d < 1) {
        if (d < 0.001) {
          ny = py + ry;
        } else {
          nx = px + (ex / d) * rx;
          ny = py + (ey / d) * ry;
        }
      }
    }
  }
  return { x: nx, y: ny };
}

/**
 * Advances stateful NPC positions in-place within their assigned 2-row band,
 * alternating between slow end-to-end walking and working pauses while enforcing
 * a minimum anti-collision separation (`minSep`, ~5 tombs away) and plot avoidance.
 */
export function stepBandNpcs(stateList, npcs, dt, mode = '2d', minSep = 600, room = 'tombstone') {
  if (!stateList || stateList.length !== npcs.length) {
    stateList.length = 0;
    npcs.forEach((npc, idx) => {
      const is2d = mode === '2d';
      const rawX = is2d ? npc.x2d : npc.x3d;
      const rawY = is2d ? npc.y2d : npc.z3d;
      const safe = resolvePlotCollision(rawX, rawY, mode, room);
      stateList.push({
        id: npc.id,
        x: safe.x,
        y: safe.y,
        tx: safe.x,
        ty: safe.y,
        mode: idx % 3 === 0 ? 'work' : 'walk',
        timer: 2.5 + ((idx * 1.37) % 4.5),
        facing: idx % 2 === 0 ? 1 : -1,
        bob: idx * 0.9,
      });
    });
  }

  const clampedDt = Math.min(0.08, Math.max(0.001, dt));
  const is2d = mode === '2d';

  const pickTarget = (npc, i, curState) => {
    const minX = is2d ? npc.minX2d : npc.minX3d;
    const maxX = is2d ? npc.maxX2d : npc.maxX3d;
    const minY = is2d ? npc.minY2d : npc.minZ3d;
    const maxY = is2d ? npc.maxY2d : npc.maxZ3d;

    let bestX = curState.x;
    let bestY = curState.y;
    let bestScore = -1;

    for (let attempt = 0; attempt < 16; attempt++) {
      // Encourage end-to-end roaming across the full 2-row band
      const rawRx = minX + Math.random() * (maxX - minX);
      const rawRy = minY + Math.random() * (maxY - minY);
      const safePt = resolvePlotCollision(rawRx, rawRy, mode, room);
      const rx = Math.max(minX, Math.min(maxX, safePt.x));
      const ry = Math.max(minY, Math.min(maxY, safePt.y));
      let minDist = Infinity;
      for (let j = 0; j < stateList.length; j++) {
        if (i === j) continue;
        const d = Math.hypot(rx - stateList[j].x, ry - stateList[j].y);
        if (d < minDist) minDist = d;
      }
      if (minDist >= minSep) {
        return { x: rx, y: ry };
      }
      if (minDist > bestScore) {
        bestScore = minDist;
        bestX = rx;
        bestY = ry;
      }
    }
    return { x: bestX, y: bestY };
  };

  for (let i = 0; i < stateList.length; i++) {
    const st = stateList[i];
    const npc = npcs[i];
    const minX = is2d ? npc.minX2d : npc.minX3d;
    const maxX = is2d ? npc.maxX2d : npc.maxX3d;
    const minY = is2d ? npc.minY2d : npc.minZ3d;
    const maxY = is2d ? npc.maxY2d : npc.maxZ3d;
    const speed = is2d ? npc.speed2d : npc.speed3d;

    // Anti-collision repulsion from any NPC closer than minSep (5 tombs away)
    let repX = 0;
    let repY = 0;
    let tooClose = false;
    for (let j = 0; j < stateList.length; j++) {
      if (i === j) continue;
      const other = stateList[j];
      const dx = st.x - other.x;
      const dy = st.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minSep) {
        tooClose = true;
        const push = ((minSep - dist) / minSep) * speed * 1.45;
        if (dist > 1) {
          repX += (dx / dist) * push;
          repY += (dy / dist) * push;
        } else {
          repX += (i < j ? -1 : 1) * push;
        }
      }
    }

    if (tooClose) {
      st.x = Math.max(minX, Math.min(maxX, st.x + repX * clampedDt));
      st.y = Math.max(minY, Math.min(maxY, st.y + repY * clampedDt));
      if (Math.abs(repX) > 0.5) st.facing = repX >= 0 ? 1 : -1;
      if (st.mode === 'work') {
        const nextPt = pickTarget(npc, i, st);
        st.tx = nextPt.x;
        st.ty = nextPt.y;
        st.mode = 'walk';
        st.timer = 14 + Math.random() * 10;
      }
    }

    st.timer -= clampedDt;
    if (st.mode === 'work') {
      st.bob += clampedDt * 3.5;
      if (st.timer <= 0) {
        const nextPt = pickTarget(npc, i, st);
        st.tx = nextPt.x;
        st.ty = nextPt.y;
        st.mode = 'walk';
        st.timer = 16 + Math.random() * 14;
      }
    } else {
      const dx = st.tx - st.x;
      const dy = st.ty - st.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10 || st.timer <= 0) {
        st.mode = 'work';
        st.timer = 3.5 + Math.random() * 4.5;
      } else {
        const step = Math.min(dist, speed * clampedDt);
        st.x = Math.max(minX, Math.min(maxX, st.x + (dx / dist) * step));
        st.y = Math.max(minY, Math.min(maxY, st.y + (dy / dist) * step));
        st.bob += clampedDt * 6;
        if (Math.abs(dx) > 1) st.facing = dx >= 0 ? 1 : -1;
      }
    }

    // Keep NPC strictly outside any tomb or niche plot footprint
    const safePos = resolvePlotCollision(st.x, st.y, mode, room);
    st.x = Math.max(minX, Math.min(maxX, safePos.x));
    st.y = Math.max(minY, Math.min(maxY, safePos.y));
  }
}

export function formatTimeAgo(createdAt, fallbackLabel = '', entryId = '') {
  let ts = Number(createdAt);
  if (!Number.isFinite(ts) || ts <= 0) {
    const m = String(entryId || '').match(/^[ot]-(\d{12,})/);
    if (m) {
      ts = Number(m[1]);
    }
  }
  if (!Number.isFinite(ts) || ts <= 0) {
    return fallbackLabel || 'Recently';
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

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
