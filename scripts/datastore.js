import {
  DEFAULT_SPECIES,
  HOOKS,
  ICONS,
  MODULE_ID,
  PATHS,
  SEED_FULL_DATA,
  SEED_PUBLIC_DATA,
  SETTINGS,
  SYSTEM_ICONS,
  UNCATEGORIZED
} from "./constants.js";

function clone(value) {
  if (foundry.utils?.deepClone) return foundry.utils.deepClone(value);
  if (globalThis.structuredClone) return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function cleanText(value, fallback = "") {
  return asString(value, fallback).trim();
}

function cleanStoredValue(value) {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : String(value);
}

function cleanArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSystemRow(row = {}, sectionRevealed = false) {
  const id = cleanText(row.id) || createWorldCodexId();
  const kind = cleanText(row.kind) || inferSystemRowKind(id);

  return {
    id,
    label: cleanText(row.label, "Detail"),
    value: cleanStoredValue(row.value),
    description: cleanStoredValue(row.description),
    icon: cleanText(row.icon) || inferSystemRowIcon(id, kind),
    kind,
    revealed: typeof row.revealed === "boolean" ? row.revealed : Boolean(sectionRevealed),
    hidden: Boolean(row.hidden)
  };
}

function inferSystemRowKind(id) {
  if (Object.hasOwn(SYSTEM_ICONS.ATTRIBUTES, id)) return "attribute";
  if (Object.hasOwn(SYSTEM_ICONS.AFFINITIES, id)) return "affinity";
  if (["level", "rank", "hp", "mp", "ip", "def", "mdef", "ac", "cr", "type", "movement"].includes(id)) return "overview";
  return "detail";
}

function inferSystemRowIcon(id, kind) {
  if (Object.hasOwn(SYSTEM_ICONS.ATTRIBUTES, id)) return SYSTEM_ICONS.ATTRIBUTES[id];
  if (Object.hasOwn(SYSTEM_ICONS.AFFINITIES, id)) return SYSTEM_ICONS.AFFINITIES[id];

  const icons = {
    level: SYSTEM_ICONS.LEVEL,
    rank: SYSTEM_ICONS.RANK,
    cr: SYSTEM_ICONS.RANK,
    hp: SYSTEM_ICONS.HP,
    mp: SYSTEM_ICONS.MP,
    ip: SYSTEM_ICONS.IP,
    def: SYSTEM_ICONS.DEF,
    ac: SYSTEM_ICONS.DEF,
    mdef: SYSTEM_ICONS.MDEF
  };

  if (icons[id]) return icons[id];
  if (kind === "attack") return SYSTEM_ICONS.ATTACK;
  if (kind === "spell") return SYSTEM_ICONS.SPELL;
  return SYSTEM_ICONS.DETAIL;
}

function normalizeSystemSection(section = {}) {
  const sectionRevealed = typeof section.revealed === "boolean" ? section.revealed : false;
  const rows = cleanArray(section.rows).map((row) => normalizeSystemRow(row, sectionRevealed));

  return {
    id: cleanText(section.id) || createWorldCodexId(),
    label: cleanText(section.label, "System Details"),
    revealed: rows.length ? rows.every((row) => row.revealed) : sectionRevealed,
    rows
  };
}

function normalizeSystemProfileData(data = {}) {
  return {
    profile: cleanText(data.profile),
    profileLabel: cleanText(data.profileLabel),
    actorUuid: cleanText(data.actorUuid),
    actorName: cleanText(data.actorName),
    actorType: cleanText(data.actorType),
    sections: cleanArray(data.sections).map(normalizeSystemSection)
  };
}

function publicSystemProfileData(data = {}) {
  const normalized = normalizeSystemProfileData(data);
  return {
    profile: normalized.profile,
    profileLabel: normalized.profileLabel,
    actorUuid: "",
    actorName: "",
    actorType: "",
    sections: normalized.sections
      .map((section) => {
        const rows = section.rows.map(publicSystemRow);
        return {
          id: section.id,
          label: section.label,
          revealed: rows.length ? rows.every((row) => row.revealed) : section.revealed,
          rows
        };
      })
      .filter((section) => section.rows.length > 0)
  };
}

function publicSystemRow(row) {
  if (row.revealed) {
    return {
      id: row.id,
      label: row.label,
      value: row.value,
      description: row.description,
      icon: row.icon,
      kind: row.kind,
      revealed: true,
      hidden: false
    };
  }

  const safeHiddenKinds = new Set(["overview", "attribute", "affinity"]);
  const keepLabelAndIcon = safeHiddenKinds.has(row.kind);

  return {
    id: row.id,
    label: keepLabelAndIcon ? row.label : "WORLD_CODEX.Hidden",
    value: "?",
    description: "",
    icon: keepLabelAndIcon ? row.icon : PATHS.UNKNOWN,
    kind: row.kind,
    revealed: false,
    hidden: true
  };
}

export function createWorldCodexId() {
  if (foundry.utils?.randomID) return foundry.utils.randomID(16);
  return Math.random().toString(36).slice(2, 12);
}

export async function confirmWorldCodexAction({ title, content, yesLabel = "Confirm" }) {
  if (foundry.applications?.api?.DialogV2?.confirm) {
    return foundry.applications.api.DialogV2.confirm({
      window: { title },
      content,
      yes: { label: yesLabel },
      modal: true
    });
  }

  return Dialog.confirm({
    title,
    content,
    defaultYes: false
  });
}

function normalizeLoot(item = {}) {
  return {
    id: cleanText(item.id) || createWorldCodexId(),
    name: cleanText(item.name, "Unnamed Loot"),
    image: cleanText(item.image, ICONS.LOOT) || ICONS.LOOT,
    description: asString(item.description),
    revealed: Boolean(item.revealed)
  };
}

function normalizeTrait(item = {}) {
  const type = item.type === "strength" ? "strength" : "weakness";
  return {
    id: cleanText(item.id) || createWorldCodexId(),
    type,
    name: cleanText(item.name, type === "strength" ? "Unnamed Strength" : "Unnamed Weakness"),
    image: cleanText(item.image, type === "strength" ? ICONS.STRENGTH : ICONS.WEAKNESS) || (type === "strength" ? ICONS.STRENGTH : ICONS.WEAKNESS),
    description: asString(item.description),
    revealed: Boolean(item.revealed)
  };
}

function normalizeCreature(creature = {}) {
  return {
    id: cleanText(creature.id) || createWorldCodexId(),
    name: cleanText(creature.name, "Unnamed Creature"),
    revealed: creature.revealed !== false,
    actorUuid: cleanText(creature.actorUuid),
    actorName: cleanText(creature.actorName),
    actorType: cleanText(creature.actorType),
    systemProfile: cleanText(creature.systemProfile),
    systemProfileData: normalizeSystemProfileData(creature.systemProfileData),
    species: cleanText(creature.species, UNCATEGORIZED) || UNCATEGORIZED,
    image: cleanText(creature.image, PATHS.DEFAULT_CREATURE) || PATHS.DEFAULT_CREATURE,
    description: asString(creature.description),
    gmNotes: asString(creature.gmNotes),
    loot: cleanArray(creature.loot).map(normalizeLoot),
    traits: cleanArray(creature.traits).map(normalizeTrait)
  };
}

function normalizeIngredient(item = {}) {
  return {
    id: cleanText(item.id) || createWorldCodexId(),
    name: cleanText(item.name, "Unnamed Ingredient"),
    image: cleanText(item.image, ICONS.RECIPE) || ICONS.RECIPE,
    quantity: cleanText(item.quantity),
    description: asString(item.description)
  };
}

function normalizeResult(result = {}) {
  return {
    name: cleanText(result.name, "Recipe Result"),
    image: cleanText(result.image, PATHS.DEFAULT_RECIPE) || PATHS.DEFAULT_RECIPE,
    description: asString(result.description)
  };
}

function normalizeRecipe(recipe = {}) {
  return {
    id: cleanText(recipe.id) || createWorldCodexId(),
    name: cleanText(recipe.name, "Unnamed Recipe"),
    category: cleanText(recipe.category, "General") || "General",
    image: cleanText(recipe.image, PATHS.DEFAULT_RECIPE) || PATHS.DEFAULT_RECIPE,
    description: asString(recipe.description),
    ingredients: cleanArray(recipe.ingredients).map(normalizeIngredient),
    result: normalizeResult(recipe.result),
    revealed: Boolean(recipe.revealed)
  };
}

function publicHiddenItem(item = {}, type) {
  return {
    id: cleanText(item.id) || createWorldCodexId(),
    type,
    name: "Hidden",
    image: PATHS.UNKNOWN,
    description: "",
    revealed: false,
    hidden: true
  };
}

function publicLoot(item) {
  if (!item.revealed) return publicHiddenItem(item);
  return {
    id: item.id,
    name: item.name,
    image: item.image || ICONS.LOOT,
    description: item.description,
    revealed: true,
    hidden: false
  };
}

function publicTrait(item) {
  if (!item.revealed) return publicHiddenItem(item, item.type);
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    image: item.image || (item.type === "strength" ? ICONS.STRENGTH : ICONS.WEAKNESS),
    description: item.description,
    revealed: true,
    hidden: false
  };
}

function publicRecipe(recipe) {
  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    image: recipe.image || PATHS.DEFAULT_RECIPE,
    description: recipe.description,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      image: ingredient.image || ICONS.RECIPE,
      quantity: ingredient.quantity,
      description: ingredient.description
    })),
    result: {
      name: recipe.result.name,
      image: recipe.result.image || PATHS.DEFAULT_RECIPE,
      description: recipe.result.description
    },
    revealed: true
  };
}

export class WorldCodexDataStore {
  static clone(value) {
    return clone(value);
  }

  static normalizeFullData(data) {
    const source = data && typeof data === "object" ? data : SEED_FULL_DATA;
    return {
      version: Number(source.version) || 1,
      bestiary: cleanArray(source.bestiary).map(normalizeCreature),
      recipes: cleanArray(source.recipes).map(normalizeRecipe)
    };
  }

  static normalizePublicData(data) {
    const source = data && typeof data === "object" ? data : SEED_PUBLIC_DATA;
    return {
      version: Number(source.version) || 1,
      bestiary: cleanArray(source.bestiary).map((creature) => ({
        id: cleanText(creature.id) || createWorldCodexId(),
        name: cleanText(creature.name, "Unnamed Creature"),
        revealed: creature.revealed !== false,
        actorUuid: "",
        actorName: "",
        actorType: "",
        systemProfile: cleanText(creature.systemProfile),
        systemProfileData: publicSystemProfileData(creature.systemProfileData),
        species: cleanText(creature.species, UNCATEGORIZED) || UNCATEGORIZED,
        image: cleanText(creature.image, PATHS.DEFAULT_CREATURE) || PATHS.DEFAULT_CREATURE,
        description: asString(creature.description),
        loot: cleanArray(creature.loot).map((item) => ({
          id: cleanText(item.id) || createWorldCodexId(),
          name: item.hidden ? "Hidden" : cleanText(item.name, "Unnamed Loot"),
          image: item.hidden ? PATHS.UNKNOWN : (cleanText(item.image, ICONS.LOOT) || ICONS.LOOT),
          description: item.hidden ? "" : asString(item.description),
          revealed: Boolean(item.revealed),
          hidden: Boolean(item.hidden)
        })),
        traits: cleanArray(creature.traits).map((item) => {
          const type = item.type === "strength" ? "strength" : "weakness";
          const fallbackImage = type === "strength" ? ICONS.STRENGTH : ICONS.WEAKNESS;
          return {
            id: cleanText(item.id) || createWorldCodexId(),
            type,
            name: item.hidden ? "Hidden" : cleanText(item.name, "Unnamed Trait"),
            image: item.hidden ? PATHS.UNKNOWN : (cleanText(item.image, fallbackImage) || fallbackImage),
            description: item.hidden ? "" : asString(item.description),
            revealed: Boolean(item.revealed),
            hidden: Boolean(item.hidden)
          };
        })
      })).filter((creature) => creature.revealed),
      recipes: cleanArray(source.recipes).map(normalizeRecipe).filter((recipe) => recipe.revealed)
    };
  }

  static buildPublicData(fullData) {
    const normalized = this.normalizeFullData(fullData);
    return {
      version: normalized.version,
      bestiary: normalized.bestiary.filter((creature) => creature.revealed).map((creature) => ({
        id: creature.id,
        name: creature.name,
        revealed: true,
        actorUuid: "",
        actorName: "",
        actorType: "",
        systemProfile: creature.systemProfile,
        systemProfileData: publicSystemProfileData(creature.systemProfileData),
        species: creature.species,
        image: creature.image || PATHS.DEFAULT_CREATURE,
        description: creature.description,
        loot: creature.loot.map(publicLoot),
        traits: creature.traits.map(publicTrait)
      })),
      recipes: normalized.recipes.filter((recipe) => recipe.revealed).map(publicRecipe)
    };
  }

  static getSpecies() {
    const raw = game.settings.get(MODULE_ID, SETTINGS.SPECIES);
    const species = cleanArray(raw).map((entry) => cleanText(entry)).filter(Boolean);
    return species.length ? species : [...DEFAULT_SPECIES];
  }

  static async setSpecies(species) {
    const cleaned = [...new Set(cleanArray(species).map((entry) => cleanText(entry)).filter(Boolean))];
    await game.settings.set(MODULE_ID, SETTINGS.SPECIES, cleaned.length ? cleaned : [...DEFAULT_SPECIES]);
    Hooks.callAll(HOOKS.DATA_UPDATED);
  }

  static getFullData() {
    if (!game.user?.isGM) return this.getPublicData();
    return this.normalizeFullData(game.settings.get(MODULE_ID, SETTINGS.FULL_DATA));
  }

  static getPublicData() {
    return this.normalizePublicData(game.settings.get(MODULE_ID, SETTINGS.PUBLIC_DATA));
  }

  static getDisplayData() {
    return game.user?.isGM ? this.getFullData() : this.getPublicData();
  }

  static async initializeDefaults() {
    if (!game.user?.isGM) return;

    const hasFullData = this.#hasStoredWorldSetting(SETTINGS.FULL_DATA);
    const hasPublicData = this.#hasStoredWorldSetting(SETTINGS.PUBLIC_DATA);
    const hasSpecies = this.#hasStoredWorldSetting(SETTINGS.SPECIES);

    if (!hasSpecies) await game.settings.set(MODULE_ID, SETTINGS.SPECIES, [...DEFAULT_SPECIES]);

    if (!hasFullData) {
      await this.saveFullData(SEED_FULL_DATA, { notify: false });
      return;
    }

    if (!hasPublicData) {
      const fullData = this.getFullData();
      await game.settings.set(MODULE_ID, SETTINGS.PUBLIC_DATA, this.buildPublicData(fullData));
    }
  }

  static async saveFullData(data, { notify = true } = {}) {
    if (!game.user?.isGM) {
      ui.notifications?.error(game.i18n.localize("WORLD_CODEX.Errors.GmOnly"));
      return null;
    }

    const fullData = this.normalizeFullData(data);

    // TODO: Full data is kept separate from player render data, and world settings are
    // permission-gated for writes, but Foundry world settings are not cryptographic
    // secret storage. Hardening true secrecy would use a GM-only socket workflow or
    // server-side storage so non-GM clients never receive fullData at all.
    await game.settings.set(MODULE_ID, SETTINGS.FULL_DATA, fullData);
    await game.settings.set(MODULE_ID, SETTINGS.PUBLIC_DATA, this.buildPublicData(fullData));
    Hooks.callAll(HOOKS.DATA_UPDATED, fullData);

    if (notify) ui.notifications?.info(game.i18n.localize("WORLD_CODEX.Notifications.Saved"));
    return fullData;
  }

  static async upsertCreature(creature) {
    const data = this.getFullData();
    const normalized = normalizeCreature(creature);
    const index = data.bestiary.findIndex((entry) => entry.id === normalized.id);

    if (index >= 0) data.bestiary[index] = normalized;
    else data.bestiary.push(normalized);

    await this.saveFullData(data);
    return normalized;
  }

  static async deleteCreature(creatureId) {
    const data = this.getFullData();
    data.bestiary = data.bestiary.filter((creature) => creature.id !== creatureId);
    await this.saveFullData(data);
  }

  static async toggleCreatureItem(creatureId, collection, itemId) {
    const data = this.getFullData();
    const creature = data.bestiary.find((entry) => entry.id === creatureId);
    if (!creature) return;

    const list = collection === "loot" ? creature.loot : creature.traits;
    const item = list.find((entry) => entry.id === itemId);
    if (!item) return;

    item.revealed = !item.revealed;
    await this.saveFullData(data, { notify: false });
  }

  static async toggleCreatureRevealed(creatureId) {
    const data = this.getFullData();
    const creature = data.bestiary.find((entry) => entry.id === creatureId);
    if (!creature) return;

    creature.revealed = creature.revealed === false;
    await this.saveFullData(data, { notify: false });
  }

  static async setCreatureSectionRevealed(creatureId, section, revealed) {
    const data = this.getFullData();
    const creature = data.bestiary.find((entry) => entry.id === creatureId);
    if (!creature) return;

    if (section === "loot") {
      for (const item of creature.loot) item.revealed = Boolean(revealed);
    } else {
      const type = section === "strength" ? "strength" : "weakness";
      for (const item of creature.traits.filter((trait) => trait.type === type)) item.revealed = Boolean(revealed);
    }

    await this.saveFullData(data, { notify: false });
  }

  static async toggleCreatureSystemSection(creatureId, sectionId) {
    const data = this.getFullData();
    const creature = data.bestiary.find((entry) => entry.id === creatureId);
    const section = creature?.systemProfileData?.sections?.find((entry) => entry.id === sectionId);
    if (!section) return;

    const nextRevealed = !section.rows.every((row) => row.revealed);
    section.revealed = nextRevealed;
    for (const row of section.rows) row.revealed = nextRevealed;
    await this.saveFullData(data, { notify: false });
  }

  static async toggleCreatureSystemRow(creatureId, sectionId, rowId) {
    const data = this.getFullData();
    const creature = data.bestiary.find((entry) => entry.id === creatureId);
    const section = creature?.systemProfileData?.sections?.find((entry) => entry.id === sectionId);
    const row = section?.rows?.find((entry) => entry.id === rowId);
    if (!row) return;

    row.revealed = !row.revealed;
    if (section) section.revealed = section.rows.every((entry) => entry.revealed);
    await this.saveFullData(data, { notify: false });
  }

  static async deleteCreatureItem(creatureId, collection, itemId) {
    const data = this.getFullData();
    const creature = data.bestiary.find((entry) => entry.id === creatureId);
    if (!creature) return;

    if (collection === "loot") creature.loot = creature.loot.filter((item) => item.id !== itemId);
    else creature.traits = creature.traits.filter((item) => item.id !== itemId);

    await this.saveFullData(data);
  }

  static async upsertRecipe(recipe) {
    const data = this.getFullData();
    const normalized = normalizeRecipe(recipe);
    const index = data.recipes.findIndex((entry) => entry.id === normalized.id);

    if (index >= 0) data.recipes[index] = normalized;
    else data.recipes.push(normalized);

    await this.saveFullData(data);
    return normalized;
  }

  static async deleteRecipe(recipeId) {
    const data = this.getFullData();
    data.recipes = data.recipes.filter((recipe) => recipe.id !== recipeId);
    await this.saveFullData(data);
  }

  static countCreaturesBySpecies(species) {
    return this.getFullData().bestiary.filter((creature) => creature.species === species).length;
  }

  static async renameSpecies(oldName, newName) {
    const oldSpecies = cleanText(oldName);
    const newSpecies = cleanText(newName);
    if (!oldSpecies || !newSpecies || oldSpecies === newSpecies) return;

    const data = this.getFullData();
    for (const creature of data.bestiary) {
      if (creature.species === oldSpecies) creature.species = newSpecies;
    }
    await this.saveFullData(data, { notify: false });
  }

  static async moveSpeciesCreatures(oldSpecies, newSpecies = UNCATEGORIZED) {
    const source = cleanText(oldSpecies);
    const target = cleanText(newSpecies, UNCATEGORIZED) || UNCATEGORIZED;
    if (!source) return;

    const data = this.getFullData();
    for (const creature of data.bestiary) {
      if (creature.species === source) creature.species = target;
    }
    await this.saveFullData(data, { notify: false });
  }

  static #hasStoredWorldSetting(key) {
    try {
      const storage = game.settings.storage?.get("world");
      return Boolean(storage?.get?.(`${MODULE_ID}.${key}`));
    } catch (_error) {
      return false;
    }
  }
}
