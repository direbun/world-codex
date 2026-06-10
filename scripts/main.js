import { HOOKS, MODULE_ID, MODULE_TITLE, TEMPLATES } from "./constants.js";
import { WorldCodexDataStore } from "./datastore.js";
import { registerWorldCodexSettings } from "./settings.js";
import { WorldCodexApp } from "./apps/codex-app.js";
import { BestiaryEditor } from "./apps/bestiary-editor.js";
import { RecipeEditor } from "./apps/recipe-editor.js";
import { SpeciesManager } from "./apps/species-manager.js";

const CONTROL_NAME = "worldCodex";
const TOOL_NAME = "openWorldCodex";

Hooks.once("init", () => {
  registerWorldCodexSettings();
  registerWorldCodexKeybindings();
  const loadTemplateFiles = foundry.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  if (loadTemplateFiles) {
    const preload = loadTemplateFiles(Object.values(TEMPLATES));
    preload?.catch?.((error) => {
      console.error(`${MODULE_ID} | Failed to preload templates`, error);
    });
  }
});

Hooks.once("ready", async () => {
  await WorldCodexDataStore.initializeDefaults();

  game.worldCodex = {
    app: null,
    open: openWorldCodex,
    close: closeWorldCodex,
    toggle: toggleWorldCodex,
    data: WorldCodexDataStore,
    applications: {
      WorldCodexApp,
      BestiaryEditor,
      RecipeEditor,
      SpeciesManager
    }
  };
});

Hooks.on(HOOKS.DATA_UPDATED, () => {
  const app = game.worldCodex?.app;
  if (!app?.rendered) return;
  if (app.refresh) app.refresh();
  else app.render({ force: true });
});

Hooks.on("getSceneControlButtons", (controls) => {
  // Foundry v13/v14 provide record-style controls; the array branch keeps the
  // button harmless if a future compatibility shim exposes the older shape.
  if (Array.isArray(controls)) {
    const target = controls.find((control) => control.name === "tokens") ?? controls[0];
    if (target?.tools) target.tools.push(createSceneTool(target.tools.length));
    controls.push({
      name: CONTROL_NAME,
      title: "WORLD_CODEX.Title",
      icon: "fa-solid fa-book-open",
      visible: true,
      activeTool: TOOL_NAME,
      tools: [createSceneTool(0)]
    });
    return;
  }

  controls[CONTROL_NAME] = {
    name: CONTROL_NAME,
    title: "WORLD_CODEX.Title",
    icon: "fa-solid fa-book-open",
    order: 100,
    visible: true,
    activeTool: TOOL_NAME,
    tools: {
      [TOOL_NAME]: createSceneTool(0)
    }
  };

  if (controls.tokens?.tools) {
    controls.tokens.tools[TOOL_NAME] = createSceneTool(Object.keys(controls.tokens.tools).length);
  }
});

function registerWorldCodexKeybindings() {
  game.keybindings?.register?.(MODULE_ID, "toggleCodex", {
    name: "WORLD_CODEX.Keybindings.Toggle.Name",
    hint: "WORLD_CODEX.Keybindings.Toggle.Hint",
    editable: [{ key: "F9" }],
    onDown: () => {
      toggleWorldCodex();
      return true;
    },
    restricted: false,
    precedence: globalThis.CONST?.KEYBINDING_PRECEDENCE?.NORMAL ?? 0
  });
}

function createSceneTool(order) {
  return {
    name: TOOL_NAME,
    title: "WORLD_CODEX.Controls.Open",
    icon: "fa-solid fa-book-open",
    order,
    button: true,
    visible: true,
    onClick: toggleWorldCodex,
    onChange: toggleWorldCodex
  };
}

function openWorldCodex() {
  const existing = game.worldCodex?.app;
  if (existing?.rendered) {
    existing.bringToFront();
    return existing;
  }

  const app = new WorldCodexApp();
  game.worldCodex ??= {};
  game.worldCodex.app = app;
  app.render({ force: true });
  return app;
}

function closeWorldCodex() {
  const existing = game.worldCodex?.app;
  if (existing?.rendered) existing.close();
  if (game.worldCodex) game.worldCodex.app = null;
}

function toggleWorldCodex() {
  const existing = game.worldCodex?.app;
  if (existing?.rendered) {
    closeWorldCodex();
    return;
  }

  openWorldCodex();
}
