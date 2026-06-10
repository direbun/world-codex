import { MODULE_ID, SETTINGS, SYSTEM_ICONS } from "./constants.js";

export const SYSTEM_PROFILE_AUTO = "auto";
export const SYSTEM_PROFILE_GENERIC = "generic";
export const SYSTEM_PROFILE_DND5E = "dnd5e";
export const SYSTEM_PROFILE_FABULA_ULTIMA = "fabula-ultima";

export const SYSTEM_PROFILE_CHOICES = {
  [SYSTEM_PROFILE_AUTO]: "WORLD_CODEX.SystemProfile.Auto",
  [SYSTEM_PROFILE_GENERIC]: "WORLD_CODEX.SystemProfile.Generic",
  [SYSTEM_PROFILE_DND5E]: "WORLD_CODEX.SystemProfile.Dnd5e",
  [SYSTEM_PROFILE_FABULA_ULTIMA]: "WORLD_CODEX.SystemProfile.FabulaUltima"
};

const PROFILE_LABELS = {
  [SYSTEM_PROFILE_AUTO]: "WORLD_CODEX.SystemProfile.Auto",
  [SYSTEM_PROFILE_GENERIC]: "WORLD_CODEX.SystemProfile.Generic",
  [SYSTEM_PROFILE_DND5E]: "WORLD_CODEX.SystemProfile.Dnd5e",
  [SYSTEM_PROFILE_FABULA_ULTIMA]: "WORLD_CODEX.SystemProfile.FabulaUltima"
};

export function getConfiguredSystemProfile() {
  try {
    return game.settings.get(MODULE_ID, SETTINGS.SYSTEM_PROFILE) || SYSTEM_PROFILE_AUTO;
  } catch (_error) {
    return SYSTEM_PROFILE_AUTO;
  }
}

export function getWorldCodexSystemProfile() {
  const configured = getConfiguredSystemProfile();
  if (configured !== SYSTEM_PROFILE_AUTO) return configured;

  const systemId = String(game.system?.id ?? "").toLocaleLowerCase(game.i18n?.lang);
  if (systemId === "dnd5e") return SYSTEM_PROFILE_DND5E;
  if (systemId.includes("fabula") || systemId.includes("ultima") || systemId === "projectfu") return SYSTEM_PROFILE_FABULA_ULTIMA;
  return SYSTEM_PROFILE_GENERIC;
}

export function getWorldCodexSystemProfileLabel(profileId = getWorldCodexSystemProfile()) {
  return game.i18n.localize(PROFILE_LABELS[profileId] ?? PROFILE_LABELS[SYSTEM_PROFILE_GENERIC]);
}

export async function actorToCreatureDraft(actorUuid, profileId = getWorldCodexSystemProfile()) {
  const actor = await fromUuid(actorUuid);
  if (!actor) return null;

  const systemProfile = normalizeProfile(profileId);
  const systemProfileData = buildSystemProfileData(actor, systemProfile);

  return {
    actorUuid: actor.uuid,
    actorName: actor.name,
    actorType: actor.type,
    systemProfile,
    systemProfileData,
    name: actor.name,
    image: actor.img || "",
    description: getActorDescription(actor)
  };
}

export function buildSystemProfileData(actor, profileId = getWorldCodexSystemProfile()) {
  const profile = normalizeProfile(profileId);
  const sections = profile === SYSTEM_PROFILE_DND5E
    ? buildDnd5eSections(actor)
    : profile === SYSTEM_PROFILE_FABULA_ULTIMA
      ? buildFabulaUltimaSections(actor)
      : buildGenericSections(actor);

  return {
    profile,
    profileLabel: getWorldCodexSystemProfileLabel(profile),
    actorUuid: actor.uuid,
    actorName: actor.name,
    actorType: actor.type,
    sections: sections.filter((entry) => entry.rows.length > 0)
  };
}

function normalizeProfile(profileId) {
  return Object.hasOwn(SYSTEM_PROFILE_CHOICES, profileId) && profileId !== SYSTEM_PROFILE_AUTO
    ? profileId
    : getWorldCodexSystemProfile();
}

function buildGenericSections(actor) {
  return [
    section("overview", "WORLD_CODEX.SystemSections.Overview", [
      row("type", "WORLD_CODEX.SystemFields.ActorType", actor.type, "", { icon: SYSTEM_ICONS.DETAIL, kind: "overview" }),
      row("level", "WORLD_CODEX.SystemFields.Level", firstValue(actor, ["system.details.level.value", "system.details.cr", "system.level.value", "system.level"]), "", { icon: SYSTEM_ICONS.LEVEL, kind: "overview" }),
      row("hp", "WORLD_CODEX.SystemFields.HP", resourceValue(actor, [
        ["system.attributes.hp.value", "system.attributes.hp.max"],
        ["system.hp.value", "system.hp.max"],
        ["system.resources.hp.value", "system.resources.hp.max"]
      ]), "", { icon: SYSTEM_ICONS.HP, kind: "overview" })
    ], true)
  ];
}

function buildDnd5eSections(actor) {
  const system = actor.system ?? {};
  const traits = system.traits ?? {};

  return [
    section("overview", "WORLD_CODEX.SystemSections.Overview", [
      row("type", "WORLD_CODEX.SystemFields.CreatureType", traitLikeValue(traits.type) || getValue(actor, "system.details.type.value"), "", { icon: SYSTEM_ICONS.DETAIL, kind: "overview" }),
      row("cr", "WORLD_CODEX.SystemFields.Challenge", getValue(actor, "system.details.cr"), "", { icon: SYSTEM_ICONS.RANK, kind: "overview" }),
      row("ac", "WORLD_CODEX.SystemFields.AC", getValue(actor, "system.attributes.ac.value"), "", { icon: SYSTEM_ICONS.DEF, kind: "overview" }),
      row("hp", "WORLD_CODEX.SystemFields.HP", resourceValue(actor, [["system.attributes.hp.value", "system.attributes.hp.max"]]), "", { icon: SYSTEM_ICONS.HP, kind: "overview" }),
      row("movement", "WORLD_CODEX.SystemFields.Speed", movementValue(getValue(actor, "system.attributes.movement")), "", { icon: SYSTEM_ICONS.DETAIL, kind: "overview" })
    ], true),
    section("abilities", "WORLD_CODEX.SystemSections.Abilities", dnd5eAbilityRows(actor), false),
    section("defenses", "WORLD_CODEX.SystemSections.Defenses", [
      row("damage-resistances", "WORLD_CODEX.SystemFields.Resistances", traitLikeValue(traits.dr), "", { icon: SYSTEM_ICONS.DEF, kind: "affinity" }),
      row("damage-immunities", "WORLD_CODEX.SystemFields.Immunities", traitLikeValue(traits.di), "", { icon: SYSTEM_ICONS.MDEF, kind: "affinity" }),
      row("damage-vulnerabilities", "WORLD_CODEX.SystemFields.Vulnerabilities", traitLikeValue(traits.dv), "", { icon: SYSTEM_ICONS.DETAIL, kind: "affinity" }),
      row("condition-immunities", "WORLD_CODEX.SystemFields.ConditionImmunities", traitLikeValue(traits.ci) || traitLikeValue(traits.conditionImmunities), "", { icon: SYSTEM_ICONS.MDEF, kind: "affinity" })
    ], false),
    section("attacks", "WORLD_CODEX.SystemSections.Attacks", actorItemRows(actor, isDnd5eAttackItem, defaultItemValue, { icon: SYSTEM_ICONS.ATTACK, kind: "attack" }), false),
    section("spells", "WORLD_CODEX.SystemSections.Spells", actorItemRows(actor, (item) => item.type === "spell", dnd5eSpellValue, { icon: SYSTEM_ICONS.SPELL, kind: "spell" }), false)
  ];
}

function buildFabulaUltimaSections(actor) {
  return [
    section("overview", "WORLD_CODEX.SystemSections.Overview", [
      row("level", "WORLD_CODEX.SystemFields.Level", firstValue(actor, ["system.level.value", "system.level", "system.lvl.value", "system.details.level.value"]) || "-", "", { icon: SYSTEM_ICONS.LEVEL, kind: "overview" }),
      row("rank", "WORLD_CODEX.SystemFields.Rank", firstValue(actor, ["system.rank.value", "system.rank", "system.details.rank.value", "system.details.rank"]) || "-", "", { icon: SYSTEM_ICONS.RANK, kind: "overview" }),
      row("hp", "WORLD_CODEX.SystemFields.HP", resourceValue(actor, [
        ["system.resources.hp.value", "system.resources.hp.max"],
        ["system.hp.value", "system.hp.max"],
        ["system.derived.hp.value", "system.derived.hp.max"]
      ]), "", { icon: SYSTEM_ICONS.HP, kind: "overview" }),
      row("mp", "WORLD_CODEX.SystemFields.MP", resourceValue(actor, [
        ["system.resources.mp.value", "system.resources.mp.max"],
        ["system.mp.value", "system.mp.max"],
        ["system.derived.mp.value", "system.derived.mp.max"]
      ]), "", { icon: SYSTEM_ICONS.MP, kind: "overview" }),
      row("ip", "WORLD_CODEX.SystemFields.IP", resourceValue(actor, [
        ["system.resources.ip.value", "system.resources.ip.max"],
        ["system.ip.value", "system.ip.max"]
      ]), "", { icon: SYSTEM_ICONS.IP, kind: "overview" }),
      row("def", "WORLD_CODEX.SystemFields.DEF", firstValue(actor, ["system.def.value", "system.defense.value", "system.defenses.def.value", "system.derived.def.value"]), "", { icon: SYSTEM_ICONS.DEF, kind: "overview" }),
      row("mdef", "WORLD_CODEX.SystemFields.MDEF", firstValue(actor, ["system.mdef.value", "system.magicDefense.value", "system.defenses.mdef.value", "system.derived.mdef.value"]), "", { icon: SYSTEM_ICONS.MDEF, kind: "overview" })
    ], true),
    section("attributes", "WORLD_CODEX.SystemSections.Attributes", fabulaAttributeRows(actor), false),
    section("affinities", "WORLD_CODEX.SystemSections.Affinities", fabulaAffinityRows(actor), false),
    section("attacks", "WORLD_CODEX.SystemSections.Attacks", actorItemRows(actor, isFabulaAttackItem, defaultItemValue, { icon: SYSTEM_ICONS.ATTACK, kind: "attack" }), false),
    section("spells", "WORLD_CODEX.SystemSections.Spells", actorItemRows(actor, isFabulaSpellItem, defaultItemValue, { icon: SYSTEM_ICONS.SPELL, kind: "spell" }), false)
  ];
}

function section(id, label, rows, revealed = false) {
  const cleanedRows = rows
    .filter((entry) => entry.value)
    .map((entry) => ({
      ...entry,
      revealed: typeof entry.revealed === "boolean" ? entry.revealed : revealed
    }));

  return {
    id,
    label,
    revealed: cleanedRows.length ? cleanedRows.every((entry) => entry.revealed) : revealed,
    rows: cleanedRows
  };
}

function row(id, label, value, description = "", options = {}) {
  const result = {
    id,
    label,
    value: formatValue(value),
    description: formatValue(description),
    icon: options.icon || SYSTEM_ICONS.DETAIL,
    kind: options.kind || "detail"
  };

  if (typeof options.revealed === "boolean") result.revealed = options.revealed;
  return result;
}

function actorItemRows(actor, predicate, valueBuilder = defaultItemValue, options = {}) {
  return actorItems(actor)
    .filter(predicate)
    .map((item) => row(slugify(item.name), item.name, valueBuilder(item), getItemDescription(item), options))
    .filter((entry) => entry.label);
}

function actorItems(actor) {
  if (!actor.items) return [];
  return Array.from(actor.items.values ? actor.items.values() : actor.items);
}

function isDnd5eAttackItem(item) {
  if (item.type === "weapon") return true;
  if (item.type !== "feat") return false;

  const activationType = getValue(item, "system.activation.type");
  const actionType = getValue(item, "system.actionType");
  return Boolean(activationType || ["mwak", "rwak", "msak", "rsak", "save"].includes(actionType));
}

function isFabulaAttackItem(item) {
  const type = String(item.type ?? "").toLocaleLowerCase(game.i18n?.lang);
  return type.includes("attack") || type.includes("weapon") || type.includes("npc-attack");
}

function isFabulaSpellItem(item) {
  const type = String(item.type ?? "").toLocaleLowerCase(game.i18n?.lang);
  return type.includes("spell") || type.includes("ritual");
}

function defaultItemValue(item) {
  return firstValue(item, [
    "system.summary",
    "system.damage",
    "system.damage.value",
    "system.formula",
    "system.description.summary"
  ]) || item.type;
}

function dnd5eSpellValue(item) {
  const level = Number(getValue(item, "system.level"));
  const levelLabel = level === 0
    ? game.i18n.localize("WORLD_CODEX.SystemFields.Cantrip")
    : level ? game.i18n.format("WORLD_CODEX.SystemFields.SpellLevel", { level }) : "";
  const school = getValue(item, "system.school");
  return [levelLabel, school].filter(Boolean).join(" ");
}

function dnd5eAbilityRows(actor) {
  const labels = {
    str: "STR",
    dex: "DEX",
    con: "CON",
    int: "INT",
    wis: "WIS",
    cha: "CHA"
  };

  return Object.entries(labels).map(([key, label]) => {
    const value = getValue(actor, `system.abilities.${key}.value`);
    const mod = getValue(actor, `system.abilities.${key}.mod`);
    return row(key, label, mod === undefined || mod === "" ? value : `${value} (${signedNumber(mod)})`, "", { icon: SYSTEM_ICONS.ATTRIBUTES[key] || SYSTEM_ICONS.DETAIL, kind: "attribute" });
  });
}

function fabulaAttributeRows(actor) {
  const labels = {
    dex: "WORLD_CODEX.SystemFields.DEX",
    ins: "WORLD_CODEX.SystemFields.INS",
    mig: "WORLD_CODEX.SystemFields.MIG",
    wlp: "WORLD_CODEX.SystemFields.WLP"
  };

  return Object.entries(labels).map(([key, label]) => row(key, label, firstValue(actor, [
    `system.attributes.${key}.value`,
    `system.attributes.${key}.die`,
    `system.attributes.${key}.current`,
    `system.attributes.${key}.size`,
    `system.stats.${key}.value`,
    `system.stats.${key}.die`,
    `system.stats.${key}.current`,
    `system.stats.${key}.size`,
    `system.${key}.value`,
    `system.${key}.die`,
    `system.${key}.current`,
    `system.${key}.size`
  ]) || "-", "", { icon: SYSTEM_ICONS.ATTRIBUTES[key] || SYSTEM_ICONS.DETAIL, kind: "attribute" }));
}

function fabulaAffinityRows(actor) {
  return [
    fabulaAffinityRow(actor, "physical", "WORLD_CODEX.SystemFields.AffinityPhysical", ["physic", "phys", "physical"]),
    fabulaAffinityRow(actor, "air", "WORLD_CODEX.SystemFields.AffinityAir", ["air", "wind"]),
    fabulaAffinityRow(actor, "bolt", "WORLD_CODEX.SystemFields.AffinityBolt", ["bolt", "lightning", "thunder"]),
    fabulaAffinityRow(actor, "dark", "WORLD_CODEX.SystemFields.AffinityDark", ["dark", "shadow"]),
    fabulaAffinityRow(actor, "earth", "WORLD_CODEX.SystemFields.AffinityEarth", ["earth"]),
    fabulaAffinityRow(actor, "fire", "WORLD_CODEX.SystemFields.AffinityFire", ["fire"]),
    fabulaAffinityRow(actor, "ice", "WORLD_CODEX.SystemFields.AffinityIce", ["ice", "frost"]),
    fabulaAffinityRow(actor, "light", "WORLD_CODEX.SystemFields.AffinityLight", ["light", "holy"]),
    fabulaAffinityRow(actor, "poison", "WORLD_CODEX.SystemFields.AffinityPoison", ["poison", "toxic"])
  ];
}

function fabulaAffinityRow(actor, id, label, aliases) {
  return row(id, label, normalizeFabulaAffinityValue(fabulaAffinityValue(actor, aliases)), "", {
    icon: SYSTEM_ICONS.AFFINITIES[id] || SYSTEM_ICONS.DETAIL,
    kind: "affinity"
  });
}

function fabulaAffinityValue(actor, aliases) {
  const roots = [
    "system.affinities",
    "system.damageAffinities",
    "system.damageAffinity",
    "system.affinity",
    "system.damageTypes"
  ];

  for (const root of roots) {
    for (const alias of aliases) {
      const value = getValue(actor, `${root}.${alias}`);
      if (value !== undefined && value !== null && value !== "") return extractAffinityValue(value);
    }
  }

  const resistanceLike = [
    ["WORLD_CODEX.Affinity.Resistant", ["system.resistances", "system.damageResistances"]],
    ["WORLD_CODEX.Affinity.Immune", ["system.immunities", "system.damageImmunities"]],
    ["WORLD_CODEX.Affinity.Vulnerable", ["system.vulnerabilities", "system.damageVulnerabilities"]],
    ["WORLD_CODEX.Affinity.Absorption", ["system.absorptions", "system.damageAbsorptions"]]
  ];

  for (const [label, rootsForType] of resistanceLike) {
    for (const root of rootsForType) {
      const value = getValue(actor, root);
      if (affinityCollectionHas(value, aliases)) return label;
    }
  }

  return "-";
}

function extractAffinityValue(value) {
  if (!value || typeof value !== "object") return value;
  return firstValue(value, ["value", "affinity", "type", "label", "state", "current"]) || value;
}

function affinityCollectionHas(value, aliases) {
  if (!value) return false;
  if (Array.isArray(value)) return value.map((entry) => String(entry).toLocaleLowerCase(game.i18n?.lang)).some((entry) => aliases.includes(entry));
  if (value instanceof Set) return affinityCollectionHas(Array.from(value), aliases);
  if (typeof value === "string") return aliases.includes(value.toLocaleLowerCase(game.i18n?.lang));
  if (typeof value === "object") {
    return aliases.some((alias) => {
      const entry = value[alias];
      if (typeof entry === "boolean") return entry;
      return entry !== undefined && entry !== null && entry !== "" && entry !== false;
    });
  }
  return false;
}

function normalizeFabulaAffinityValue(value) {
  const raw = formatValue(value).toLocaleLowerCase(game.i18n?.lang).trim();
  if (!raw || raw === "-" || raw === "none" || raw === "normal" || raw === "neutral") return "-";

  if (["v", "vu", "vuln", "vulnerable", "vulnerability", "weak", "weakness"].includes(raw)) return "WORLD_CODEX.Affinity.Vulnerable";
  if (["r", "rs", "res", "resist", "resistant", "resistance"].includes(raw)) return "WORLD_CODEX.Affinity.Resistant";
  if (["i", "im", "imm", "immune", "immunity"].includes(raw)) return "WORLD_CODEX.Affinity.Immune";
  if (["a", "ab", "abs", "absorb", "absorbs", "absorption"].includes(raw)) return "WORLD_CODEX.Affinity.Absorption";

  const currentMatch = raw.match(/current:\s*(-?\d+)/);
  if (currentMatch) return normalizeFabulaAffinityNumber(Number(currentMatch[1]));

  if (/^-?\d+$/.test(raw)) return normalizeFabulaAffinityNumber(Number(raw));

  if (raw.includes("vulner")) return "WORLD_CODEX.Affinity.Vulnerable";
  if (raw.includes("resist")) return "WORLD_CODEX.Affinity.Resistant";
  if (raw.includes("immun")) return "WORLD_CODEX.Affinity.Immune";
  if (raw.includes("absorb") || raw.includes("absorpt")) return "WORLD_CODEX.Affinity.Absorption";
  return value || "-";
}

function normalizeFabulaAffinityNumber(value) {
  if (Number.isNaN(value)) return "-";
  if (value < 0) return "WORLD_CODEX.Affinity.Vulnerable";
  if (value === 0) return "-";
  if (value === 1) return "WORLD_CODEX.Affinity.Resistant";
  if (value === 2) return "WORLD_CODEX.Affinity.Immune";
  return "WORLD_CODEX.Affinity.Absorption";
}

function getActorDescription(actor) {
  return firstValue(actor, [
    "system.details.biography.value",
    "system.details.biography.public",
    "system.details.publicNotes",
    "system.biography.value",
    "system.description.value",
    "system.description"
  ]) || "";
}

function getItemDescription(item) {
  return firstValue(item, [
    "system.description.value",
    "system.description",
    "system.summary"
  ]) || "";
}

function traitLikeValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(formatValue).filter(Boolean).join(", ");
  if (value instanceof Set) return Array.from(value).map(formatValue).filter(Boolean).join(", ");

  const parts = [];
  const values = value.value instanceof Set ? Array.from(value.value) : value.value;
  if (Array.isArray(values)) parts.push(...values);
  else if (values) parts.push(values);
  if (value.custom) parts.push(value.custom);

  return parts.map(formatValue).filter(Boolean).join(", ");
}

function movementValue(value) {
  if (!value || typeof value !== "object") return formatValue(value);

  return Object.entries(value)
    .filter(([_key, entry]) => typeof entry === "number" || typeof entry === "string")
    .map(([key, entry]) => `${titleCase(key)} ${entry}`)
    .join(", ");
}

function resourceValue(source, pathPairs) {
  for (const [valuePath, maxPath] of pathPairs) {
    const value = getValue(source, valuePath);
    const max = getValue(source, maxPath);
    if (value !== undefined && value !== "") return max !== undefined && max !== "" ? `${value}/${max}` : value;
  }
  return "";
}

function firstValue(source, paths) {
  for (const path of paths) {
    const value = typeof path === "string" ? getValue(source, path) : path;
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function getValue(source, path) {
  return foundry.utils.getProperty(source, path);
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(formatValue).filter(Boolean).join(", ");
  if (value instanceof Set) return Array.from(value).map(formatValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    if ("value" in value) return formatValue(value.value);
    if ("label" in value) return formatValue(value.label);
    if ("type" in value) return formatValue(value.type);
    return Object.entries(value)
      .filter(([_key, entry]) => entry !== undefined && entry !== null && entry !== false && entry !== "")
      .map(([key, entry]) => `${titleCase(key)}: ${formatValue(entry)}`)
      .join(", ");
  }
  return String(value);
}

function signedNumber(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return number >= 0 ? `+${number}` : String(number);
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_.]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase(game.i18n?.lang));
}

function slugify(value) {
  return String(value ?? "")
    .toLocaleLowerCase(game.i18n?.lang)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || foundry.utils.randomID(8);
}
