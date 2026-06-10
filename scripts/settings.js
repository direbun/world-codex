import { DEFAULT_SPECIES, HOOKS, MODULE_ID, SEED_FULL_DATA, SEED_PUBLIC_DATA, SETTINGS } from "./constants.js";
import { SpeciesManager } from "./apps/species-manager.js";
import { SYSTEM_PROFILE_CHOICES, SYSTEM_PROFILE_AUTO } from "./system-profiles.js";

export function registerWorldCodexSettings() {
  game.settings.register(MODULE_ID, SETTINGS.SPECIES, {
    name: "WORLD_CODEX.Settings.Species.Name",
    hint: "WORLD_CODEX.Settings.Species.Hint",
    scope: "world",
    config: false,
    type: Array,
    default: [...DEFAULT_SPECIES],
    restricted: true,
    onChange: () => Hooks.callAll(HOOKS.DATA_UPDATED)
  });

  game.settings.register(MODULE_ID, SETTINGS.FULL_DATA, {
    name: "WORLD_CODEX.Settings.FullData.Name",
    scope: "world",
    config: false,
    type: Object,
    default: SEED_FULL_DATA,
    restricted: true,
    onChange: () => Hooks.callAll(HOOKS.DATA_UPDATED)
  });

  game.settings.register(MODULE_ID, SETTINGS.PUBLIC_DATA, {
    name: "WORLD_CODEX.Settings.PublicData.Name",
    scope: "world",
    config: false,
    type: Object,
    default: SEED_PUBLIC_DATA,
    onChange: () => Hooks.callAll(HOOKS.DATA_UPDATED)
  });

  game.settings.register(MODULE_ID, SETTINGS.DISPLAY_MODE, {
    name: "WORLD_CODEX.Settings.DisplayMode.Name",
    hint: "WORLD_CODEX.Settings.DisplayMode.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      overlay: "WORLD_CODEX.DisplayMode.Overlay",
      window: "WORLD_CODEX.DisplayMode.Window"
    },
    default: "overlay"
  });

  game.settings.register(MODULE_ID, SETTINGS.SYSTEM_PROFILE, {
    name: "WORLD_CODEX.Settings.SystemProfile.Name",
    hint: "WORLD_CODEX.Settings.SystemProfile.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: SYSTEM_PROFILE_CHOICES,
    default: SYSTEM_PROFILE_AUTO,
    restricted: true,
    onChange: () => Hooks.callAll(HOOKS.DATA_UPDATED)
  });

  game.settings.registerMenu(MODULE_ID, "speciesManager", {
    name: "WORLD_CODEX.Settings.SpeciesMenu.Name",
    label: "WORLD_CODEX.Settings.SpeciesMenu.Label",
    hint: "WORLD_CODEX.Settings.SpeciesMenu.Hint",
    icon: "fa-solid fa-list",
    type: SpeciesManager,
    restricted: true
  });
}
