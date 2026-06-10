export const MODULE_ID = "world-codex";
export const MODULE_TITLE = "World Codex";

export const SETTINGS = {
  SPECIES: "species",
  FULL_DATA: "fullData",
  PUBLIC_DATA: "publicData",
  DISPLAY_MODE: "displayMode",
  SYSTEM_PROFILE: "systemProfile"
};

export const HOOKS = {
  DATA_UPDATED: "worldCodexDataUpdated"
};

export const TABS = {
  BESTIARY: "bestiary",
  RECIPES: "recipes"
};

export const UNCATEGORIZED = "Uncategorized";

export const DEFAULT_SPECIES = [
  "Beasts",
  "Undead",
  "Relicts",
  "Ogroids",
  "Aberrations",
  "Constructs",
  "Humanoids"
];

export const PATHS = {
  DEFAULT_CREATURE: `modules/${MODULE_ID}/assets/placeholders/default-creature.svg`,
  UNKNOWN: `modules/${MODULE_ID}/assets/placeholders/unknown.svg`,
  DEFAULT_RECIPE: `modules/${MODULE_ID}/assets/placeholders/default-recipe.svg`
};

export const ICONS = {
  BOOK: `modules/${MODULE_ID}/assets/icons/book.svg`,
  BESTIARY: `modules/${MODULE_ID}/assets/icons/bestiary.svg`,
  RECIPE: `modules/${MODULE_ID}/assets/icons/recipe.svg`,
  LOOT: `modules/${MODULE_ID}/assets/icons/loot.svg`,
  WEAKNESS: `modules/${MODULE_ID}/assets/icons/weakness.svg`,
  STRENGTH: `modules/${MODULE_ID}/assets/icons/strength.svg`,
  EDIT: `modules/${MODULE_ID}/assets/icons/edit.svg`,
  EYE_OPEN: `modules/${MODULE_ID}/assets/icons/eye-open.svg`,
  EYE_CLOSED: `modules/${MODULE_ID}/assets/icons/eye-closed.svg`,
  PLUS: `modules/${MODULE_ID}/assets/icons/plus.svg`,
  TRASH: `modules/${MODULE_ID}/assets/icons/trash.svg`
};

export const SYSTEM_ICONS = {
  DETAIL: `modules/${MODULE_ID}/assets/icons/system/detail.svg`,
  LEVEL: `modules/${MODULE_ID}/assets/icons/system/level.svg`,
  RANK: `modules/${MODULE_ID}/assets/icons/system/rank.svg`,
  HP: `modules/${MODULE_ID}/assets/icons/system/hp.svg`,
  MP: `modules/${MODULE_ID}/assets/icons/system/mp.svg`,
  IP: `modules/${MODULE_ID}/assets/icons/system/ip.svg`,
  DEF: `modules/${MODULE_ID}/assets/icons/system/def.svg`,
  MDEF: `modules/${MODULE_ID}/assets/icons/system/mdef.svg`,
  ATTACK: `modules/${MODULE_ID}/assets/icons/system/attack.svg`,
  SPELL: `modules/${MODULE_ID}/assets/icons/system/spell.svg`,
  ATTRIBUTES: {
    dex: `modules/${MODULE_ID}/assets/icons/system/dex.svg`,
    ins: `modules/${MODULE_ID}/assets/icons/system/ins.svg`,
    mig: `modules/${MODULE_ID}/assets/icons/system/mig.svg`,
    wlp: `modules/${MODULE_ID}/assets/icons/system/wlp.svg`
  },
  AFFINITIES: {
    physical: `modules/${MODULE_ID}/assets/icons/system/physical.svg`,
    air: `modules/${MODULE_ID}/assets/icons/system/air.svg`,
    bolt: `modules/${MODULE_ID}/assets/icons/system/bolt.svg`,
    dark: `modules/${MODULE_ID}/assets/icons/system/dark.svg`,
    earth: `modules/${MODULE_ID}/assets/icons/system/earth.svg`,
    fire: `modules/${MODULE_ID}/assets/icons/system/fire.svg`,
    ice: `modules/${MODULE_ID}/assets/icons/system/ice.svg`,
    light: `modules/${MODULE_ID}/assets/icons/system/light.svg`,
    poison: `modules/${MODULE_ID}/assets/icons/system/poison.svg`
  },
  AFFINITY_STATES: {
    neutral: `modules/${MODULE_ID}/assets/icons/system/affinity-neutral.svg`,
    vulnerable: `modules/${MODULE_ID}/assets/icons/system/affinity-vulnerable.svg`,
    resistant: `modules/${MODULE_ID}/assets/icons/system/affinity-resistant.svg`,
    immune: `modules/${MODULE_ID}/assets/icons/system/affinity-immune.svg`,
    absorption: `modules/${MODULE_ID}/assets/icons/system/affinity-absorption.svg`
  }
};

export const TEMPLATES = {
  CODEX_APP: `modules/${MODULE_ID}/templates/codex-app.hbs`,
  BESTIARY_EDITOR: `modules/${MODULE_ID}/templates/bestiary-editor.hbs`,
  SPECIES_MANAGER: `modules/${MODULE_ID}/templates/species-manager.hbs`,
  RECIPE_EDITOR: `modules/${MODULE_ID}/templates/recipe-editor.hbs`
};

export const SEED_FULL_DATA = {
  version: 1,
  bestiary: [
    {
      id: "sample-forest-horror",
      name: "Sample Forest Horror",
      revealed: true,
      species: "Relicts",
      image: PATHS.DEFAULT_CREATURE,
      description: "A placeholder creature entry used to demonstrate the codex layout.",
      gmNotes: "Replace this sample with your own system-agnostic creature lore.",
      loot: [
        {
          id: "sample-claw",
          name: "Sample Claw",
          image: ICONS.LOOT,
          description: "A jagged talon useful for crafting examples.",
          revealed: false
        },
        {
          id: "strange-hide",
          name: "Strange Hide",
          image: ICONS.LOOT,
          description: "A rough hide marked by pale scars.",
          revealed: true
        }
      ],
      traits: [
        {
          id: "fire",
          type: "weakness",
          name: "Fire",
          image: ICONS.WEAKNESS,
          description: "Flame unsettles the creature and exposes its shape.",
          revealed: false
        },
        {
          id: "ambush-predator",
          type: "strength",
          name: "Ambush Predator",
          image: ICONS.STRENGTH,
          description: "It strikes from cover before its prey can draw breath.",
          revealed: true
        }
      ]
    }
  ],
  recipes: [
    {
      id: "sample-tonic",
      name: "Sample Tonic",
      category: "Alchemy",
      image: PATHS.DEFAULT_RECIPE,
      description: "A simple placeholder recipe used to demonstrate the recipe layout.",
      ingredients: [
        {
          id: "bitter-herb",
          name: "Bitter Herb",
          image: ICONS.RECIPE,
          quantity: "1 handful",
          description: "An astringent herb used as a sample ingredient."
        }
      ],
      result: {
        name: "Sample Tonic",
        image: PATHS.DEFAULT_RECIPE,
        description: "A mild tonic with no system-specific mechanics."
      },
      revealed: true
    }
  ]
};

export const SEED_PUBLIC_DATA = {
  version: 1,
  bestiary: [
    {
      id: "sample-forest-horror",
      name: "Sample Forest Horror",
      revealed: true,
      species: "Relicts",
      image: PATHS.DEFAULT_CREATURE,
      description: "A placeholder creature entry used to demonstrate the codex layout.",
      loot: [
        {
          id: "sample-claw",
          name: "Hidden",
          image: PATHS.UNKNOWN,
          description: "",
          revealed: false,
          hidden: true
        },
        {
          id: "strange-hide",
          name: "Strange Hide",
          image: ICONS.LOOT,
          description: "A rough hide marked by pale scars.",
          revealed: true,
          hidden: false
        }
      ],
      traits: [
        {
          id: "fire",
          type: "weakness",
          name: "Hidden",
          image: PATHS.UNKNOWN,
          description: "",
          revealed: false,
          hidden: true
        },
        {
          id: "ambush-predator",
          type: "strength",
          name: "Ambush Predator",
          image: ICONS.STRENGTH,
          description: "It strikes from cover before its prey can draw breath.",
          revealed: true,
          hidden: false
        }
      ]
    }
  ],
  recipes: [
    {
      id: "sample-tonic",
      name: "Sample Tonic",
      category: "Alchemy",
      image: PATHS.DEFAULT_RECIPE,
      description: "A simple placeholder recipe used to demonstrate the recipe layout.",
      ingredients: [
        {
          id: "bitter-herb",
          name: "Bitter Herb",
          image: ICONS.RECIPE,
          quantity: "1 handful",
          description: "An astringent herb used as a sample ingredient."
        }
      ],
      result: {
        name: "Sample Tonic",
        image: PATHS.DEFAULT_RECIPE,
        description: "A mild tonic with no system-specific mechanics."
      },
      revealed: true
    }
  ]
};
