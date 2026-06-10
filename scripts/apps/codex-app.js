import { ICONS, MODULE_ID, MODULE_TITLE, PATHS, SETTINGS, SYSTEM_ICONS, TABS, TEMPLATES, UNCATEGORIZED } from "../constants.js";
import { confirmWorldCodexAction, createWorldCodexId, WorldCodexDataStore } from "../datastore.js";
import { BestiaryEditor } from "./bestiary-editor.js";
import { RecipeEditor } from "./recipe-editor.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const BaseApplication = HandlebarsApplicationMixin(ApplicationV2);
const UI_STATE_FLAG = "uiState";
const HISTORY_FLAG = "history";
const MAX_HISTORY = 10;

export class WorldCodexApp extends BaseApplication {
  static DEFAULT_OPTIONS = {
    id: "world-codex-app",
    classes: ["world-codex-window"],
    tag: "section",
    window: {
      title: MODULE_TITLE,
      icon: "fa-solid fa-book-open",
      resizable: true
    },
    position: {
      width: 1500,
      height: 880
    }
  };

  static PARTS = {
    body: {
      template: TEMPLATES.CODEX_APP
    }
  };

  constructor(options = {}) {
    super(options);
    const state = this.#getUiState();
    this.activeTab = state.activeTab ?? TABS.BESTIARY;
    this.selectedCreatureId = state.selectedCreatureId ?? null;
    this.selectedRecipeId = state.selectedRecipeId ?? null;
    this.searchTerms = {
      [TABS.BESTIARY]: state.searchTerms?.[TABS.BESTIARY] ?? "",
      [TABS.RECIPES]: state.searchTerms?.[TABS.RECIPES] ?? ""
    };
    this.collapsedSpecies = state.collapsedSpecies && typeof state.collapsedSpecies === "object"
      ? { ...state.collapsedSpecies }
      : {};
    this.gmView = game.user?.isGM ? state.gmView !== false : false;
    this.history = this.#getHistory();
    this.displayMode = this.#getDisplayMode();
    this._appliedDisplayMode = null;
    this._saveUiState = foundry.utils.debounce(this.#saveUiState.bind(this), 100);
    this._renderSearch = foundry.utils.debounce(() => this.render({ force: true }), 180);
    this.refresh = foundry.utils.debounce(() => {
      if (this.rendered) this.render({ force: true });
    }, 50);
    this._boundKeydown = (event) => this.#onKeydown(event);
    this._contextMenus = [];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const isGM = Boolean(game.user?.isGM);
    const canEdit = this.#canEdit();
    this.displayMode = this.#getDisplayMode();
    const data = this.#getDisplayData();

    const bestiary = this.#prepareBestiaryContext(data);
    const recipes = this.#prepareRecipesContext(data);

    return {
      ...context,
      moduleId: MODULE_ID,
      isGM,
      canEdit,
      gmView: this.gmView,
      isPlayerPreview: isGM && !this.gmView,
      viewModeLabel: this.gmView
        ? game.i18n.localize("WORLD_CODEX.GmView")
        : game.i18n.localize("WORLD_CODEX.PlayerView"),
      viewModeTitle: this.gmView
        ? game.i18n.localize("WORLD_CODEX.Actions.SwitchToPlayerView")
        : game.i18n.localize("WORLD_CODEX.Actions.SwitchToGmView"),
      viewModeIcon: this.gmView ? "fa-user-secret" : "fa-users",
      icons: ICONS,
      paths: PATHS,
      activeTab: this.activeTab,
      displayMode: this.displayMode,
      isOverlayMode: this.displayMode === "overlay",
      displayModeButtonTitle: this.displayMode === "overlay"
        ? game.i18n.localize("WORLD_CODEX.Actions.SwitchToWindow")
        : game.i18n.localize("WORLD_CODEX.Actions.SwitchToOverlay"),
      displayModeButtonIcon: this.displayMode === "overlay"
        ? "fa-window-restore"
        : "fa-expand",
      history: this.history,
      hasHistory: this.history.length > 0,
      bestiarySearch: this.searchTerms[TABS.BESTIARY],
      recipesSearch: this.searchTerms[TABS.RECIPES],
      isBestiaryActive: this.activeTab === TABS.BESTIARY,
      isRecipesActive: this.activeTab === TABS.RECIPES,
      bestiaryTabClass: this.activeTab === TABS.BESTIARY ? "world-codex-is-active" : "",
      recipesTabClass: this.activeTab === TABS.RECIPES ? "world-codex-is-active" : "",
      ...bestiary,
      ...recipes
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.#applyDisplayMode();
    document.removeEventListener("keydown", this._boundKeydown);
    document.addEventListener("keydown", this._boundKeydown);

    for (const element of this.element.querySelectorAll("[data-action]")) {
      element.addEventListener("click", (event) => this.#onAction(event));
    }

    for (const element of this.element.querySelectorAll("[data-search]")) {
      element.addEventListener("input", (event) => this.#onSearchInput(event));
    }

    this.#activateContextMenus();
  }

  async _onClose(options) {
    document.removeEventListener("keydown", this._boundKeydown);
    await this.#saveUiState();
    await super._onClose(options);
    if (game.worldCodex?.app === this) game.worldCodex.app = null;
  }

  #prepareBestiaryContext(data) {
    const allCreatures = data.bestiary ?? [];
    const creatures = allCreatures.filter((creature) => this.#matchesCreatureSearch(creature));
    const hasSearch = Boolean(this.#normalizeSearch(this.searchTerms[TABS.BESTIARY]));

    if (!allCreatures.some((creature) => creature.id === this.selectedCreatureId)) {
      this.selectedCreatureId = allCreatures[0]?.id ?? null;
    }

    if (this.searchTerms[TABS.BESTIARY] && !creatures.some((creature) => creature.id === this.selectedCreatureId)) {
      this.selectedCreatureId = creatures[0]?.id ?? null;
    }

    const selected = allCreatures.find((creature) => creature.id === this.selectedCreatureId) ?? creatures[0] ?? null;
    const configuredSpecies = WorldCodexDataStore.getSpecies();
    const dataSpecies = allCreatures.map((creature) => creature.species || UNCATEGORIZED);
    const species = [...new Set([...configuredSpecies, ...dataSpecies])];
    if (creatures.some((creature) => !creature.species) && !species.includes(UNCATEGORIZED)) species.push(UNCATEGORIZED);

    const speciesGroups = species.map((speciesName) => {
      const groupCreatures = creatures
        .filter((creature) => (creature.species || UNCATEGORIZED) === speciesName)
        .map((creature) => ({
          ...creature,
          isSelected: creature.id === this.selectedCreatureId,
          revealStateClass: creature.revealed !== false ? "world-codex-is-revealed" : "world-codex-is-unrevealed",
          revealStateLabel: game.i18n.localize(creature.revealed !== false ? "WORLD_CODEX.Revealed" : "WORLD_CODEX.Hidden")
        }));
      const isCollapsed = !hasSearch && Boolean(this.collapsedSpecies[speciesName]);

      return {
        name: speciesName,
        creatures: groupCreatures,
        hasCreatures: groupCreatures.length > 0,
        creatureCount: groupCreatures.length,
        isCollapsed,
        collapseIcon: isCollapsed ? "fa-caret-right" : "fa-caret-down",
        collapseTitle: game.i18n.localize(isCollapsed ? "WORLD_CODEX.Actions.ExpandSpecies" : "WORLD_CODEX.Actions.CollapseSpecies")
      };
    });

    return {
      speciesGroups,
      selectedCreature: selected ? this.#decorateCreature(selected) : null,
      hasCreature: Boolean(selected),
      bestiaryHasSearchResults: creatures.length > 0
    };
  }

  #prepareRecipesContext(data) {
    const allRecipes = data.recipes ?? [];
    const recipes = allRecipes.filter((recipe) => this.#matchesRecipeSearch(recipe));

    if (!allRecipes.some((recipe) => recipe.id === this.selectedRecipeId)) {
      this.selectedRecipeId = allRecipes[0]?.id ?? null;
    }

    if (this.searchTerms[TABS.RECIPES] && !recipes.some((recipe) => recipe.id === this.selectedRecipeId)) {
      this.selectedRecipeId = recipes[0]?.id ?? null;
    }

    const selected = allRecipes.find((recipe) => recipe.id === this.selectedRecipeId) ?? recipes[0] ?? null;
    const categories = [...new Set(recipes.map((recipe) => recipe.category || "General"))];
    const recipeGroups = categories.map((category) => {
      const groupRecipes = recipes
        .filter((recipe) => (recipe.category || "General") === category)
        .map((recipe) => ({
          ...recipe,
          isSelected: recipe.id === this.selectedRecipeId
        }));

      return {
        name: category,
        recipes: groupRecipes,
        hasRecipes: groupRecipes.length > 0
      };
    });

    return {
      recipeGroups,
      selectedRecipe: selected ? this.#decorateRecipe(selected) : null,
      hasRecipe: Boolean(selected),
      recipesHaveSearchResults: recipes.length > 0
    };
  }

  #matchesCreatureSearch(creature) {
    const term = this.#normalizeSearch(this.searchTerms[TABS.BESTIARY]);
    if (!term) return true;

    const searchable = [
      creature.name,
      creature.species,
      creature.description,
      creature.gmNotes,
      creature.actorName,
      creature.systemProfileData?.profileLabel,
      ...(creature.systemProfileData?.sections ?? []).flatMap((section) => [
        section.label,
        ...(section.rows ?? []).flatMap((row) => [row.label, row.value, row.description])
      ]),
      ...(creature.loot ?? []).flatMap((item) => [item.name, item.description]),
      ...(creature.traits ?? []).flatMap((item) => [item.name, item.description, item.type])
    ].join(" ");

    return this.#normalizeSearch(searchable).includes(term);
  }

  #matchesRecipeSearch(recipe) {
    const term = this.#normalizeSearch(this.searchTerms[TABS.RECIPES]);
    if (!term) return true;

    const searchable = [
      recipe.name,
      recipe.category,
      recipe.description,
      recipe.result?.name,
      recipe.result?.description,
      ...(recipe.ingredients ?? []).flatMap((item) => [item.name, item.quantity, item.description])
    ].join(" ");

    return this.#normalizeSearch(searchable).includes(term);
  }

  #normalizeSearch(value) {
    return String(value ?? "").toLocaleLowerCase(game.i18n.lang).trim();
  }

  #decorateCreature(creature) {
    const loot = (creature.loot ?? []).map((item) => this.#decorateTile(item, "loot"));
    const weaknesses = (creature.traits ?? [])
      .filter((item) => item.type === "weakness")
      .map((item) => this.#decorateTile(item, "weakness"));
    const strengths = (creature.traits ?? [])
      .filter((item) => item.type === "strength")
      .map((item) => this.#decorateTile(item, "strength"));
    const systemProfileData = this.#decorateSystemProfileData(creature.systemProfileData);
    const revealed = creature.revealed !== false;

    return {
      ...creature,
      revealed,
      revealStateClass: revealed ? "world-codex-is-revealed" : "world-codex-is-unrevealed",
      revealStateLabel: game.i18n.localize(revealed ? "WORLD_CODEX.Revealed" : "WORLD_CODEX.Hidden"),
      revealToggleIcon: revealed ? ICONS.EYE_OPEN : ICONS.EYE_CLOSED,
      revealToggleTitle: game.i18n.localize(revealed ? "WORLD_CODEX.Actions.HideCreature" : "WORLD_CODEX.Actions.RevealCreature"),
      loot,
      weaknesses,
      strengths,
      hasLoot: loot.length > 0,
      hasWeaknesses: weaknesses.length > 0,
      hasStrengths: strengths.length > 0,
      lootReveal: this.#revealSummary(loot),
      weaknessReveal: this.#revealSummary(weaknesses),
      strengthReveal: this.#revealSummary(strengths),
      systemProfileData,
      hasSystemDetails: systemProfileData.sections.length > 0
    };
  }

  #decorateSystemProfileData(systemProfileData = {}) {
    const sections = (systemProfileData.sections ?? []).map((section) => {
      const rows = (section.rows ?? []).map((row) => this.#decorateSystemRow(row, section.id));
      const allRowsRevealed = rows.length > 0 && rows.every((row) => row.revealed);

      return {
        ...section,
        label: this.#localizeMaybe(section.label),
        revealed: allRowsRevealed,
        revealStateClass: allRowsRevealed ? "world-codex-is-revealed" : "world-codex-is-unrevealed",
        revealStateLabel: game.i18n.localize(allRowsRevealed ? "WORLD_CODEX.Revealed" : "WORLD_CODEX.Hidden"),
        toggleIcon: allRowsRevealed ? ICONS.EYE_CLOSED : ICONS.EYE_OPEN,
        toggleTitle: game.i18n.localize(allRowsRevealed ? "WORLD_CODEX.Actions.HideSection" : "WORLD_CODEX.Actions.RevealSection"),
        revealSummary: this.#revealSummary(rows),
        rows
      };
    });

    return {
      ...systemProfileData,
      profileLabel: systemProfileData.profileLabel || "",
      sections
    };
  }

  #decorateSystemRow(row, sectionId) {
    const revealed = row.revealed !== false && !row.hidden;
    const hidden = !revealed;
    const label = this.#localizeMaybe(row.label);
    const value = this.#localizeMaybe(row.value);
    const description = row.description ?? "";
    const tooltipDescription = hidden && !this.#canEdit() ? "" : description;
    const isAffinityRow = this.#isAffinityRow(row, sectionId);
    const affinityState = hidden && !this.#canEdit() ? "" : this.#affinityStateForRow(row, sectionId);
    const affinityStateLabel = affinityState ? this.#affinityStateLabel(affinityState) : "";
    const showAffinityIconValue = isAffinityRow && Boolean(affinityState);
    const displayValue = hidden && !this.#canEdit() ? "?" : isAffinityRow ? "" : value;
    const tooltipValue = showAffinityIconValue ? affinityStateLabel : displayValue;

    return {
      ...row,
      sectionId,
      label,
      value,
      displayValue,
      description: tooltipDescription,
      hidden,
      revealed,
      tileImage: row.icon || PATHS.UNKNOWN,
      hasAffinityState: Boolean(affinityState),
      affinityState,
      affinityStateIcon: affinityState ? SYSTEM_ICONS.AFFINITY_STATES[affinityState] : "",
      affinityStateLabel,
      showAffinityIconValue,
      revealStateClass: revealed ? "world-codex-is-revealed" : "world-codex-is-unrevealed",
      revealStateLabel: game.i18n.localize(revealed ? "WORLD_CODEX.Revealed" : "WORLD_CODEX.Hidden"),
      toggleIcon: revealed ? ICONS.EYE_CLOSED : ICONS.EYE_OPEN,
      toggleTitle: game.i18n.localize(revealed ? "WORLD_CODEX.Actions.Hide" : "WORLD_CODEX.Actions.Reveal"),
      tooltipText: this.#buildTooltipText(label, [tooltipValue, tooltipDescription].filter(Boolean).join(": "))
    };
  }

  #isAffinityRow(row, sectionId) {
    return sectionId === "affinities"
      || row.kind === "affinity"
      || Object.hasOwn(SYSTEM_ICONS.AFFINITIES, row.id);
  }

  #affinityStateForRow(row, sectionId) {
    if (!this.#isAffinityRow(row, sectionId)) return "";

    const raw = String(row.value ?? "").toLocaleLowerCase(game.i18n.lang).trim();
    if (!raw || raw === "?") return "";

    const currentMatch = raw.match(/current:\s*(-?\d+)/);
    if (currentMatch) return this.#numericAffinityState(Number(currentMatch[1]));

    if (/^-?\d+$/.test(raw)) return this.#numericAffinityState(Number(raw));
    if (raw === "-" || raw === "none" || raw.includes("normal") || raw.includes("neutral")) return "neutral";
    if (raw.includes("vulner") || raw.includes("weak") || raw === "v" || raw === "vu" || raw === "vuln") return "vulnerable";
    if (raw.includes("resist") || raw === "r" || raw === "rs" || raw === "res") return "resistant";
    if (raw.includes("immun") || raw === "i" || raw === "im" || raw === "imm") return "immune";
    if (raw.includes("absorb") || raw.includes("absorpt") || raw === "a" || raw === "ab" || raw === "abs" || raw === "+") return "absorption";
    return "neutral";
  }

  #numericAffinityState(value) {
    if (Number.isNaN(value)) return "";
    if (value < 0) return "vulnerable";
    if (value === 0) return "neutral";
    if (value === 1) return "resistant";
    if (value === 2) return "immune";
    return "absorption";
  }

  #affinityStateLabel(state) {
    const labels = {
      neutral: "WORLD_CODEX.Affinity.Neutral",
      vulnerable: "WORLD_CODEX.Affinity.Vulnerable",
      resistant: "WORLD_CODEX.Affinity.Resistant",
      immune: "WORLD_CODEX.Affinity.Immune",
      absorption: "WORLD_CODEX.Affinity.Absorption"
    };

    return game.i18n.localize(labels[state] ?? "");
  }

  #revealSummary(items) {
    const total = items.length;
    const revealed = items.filter((item) => item.revealed).length;

    return {
      total,
      revealed,
      text: game.i18n.format("WORLD_CODEX.RevealSummary", { revealed, total })
    };
  }

  #decorateRecipe(recipe) {
    return {
      ...recipe,
      ingredients: (recipe.ingredients ?? []).map((ingredient) => ({
        ...ingredient,
        tileImage: ingredient.image || ICONS.RECIPE,
        displayName: ingredient.name,
        tooltipTitle: ingredient.name,
        tooltipDescription: ingredient.description,
        tooltipText: this.#buildTooltipText(ingredient.name, ingredient.description)
      })),
      hasIngredients: (recipe.ingredients ?? []).length > 0,
      result: {
        ...recipe.result,
        tileImage: recipe.result?.image || PATHS.DEFAULT_RECIPE
      }
    };
  }

  #decorateTile(item, fallbackType) {
    const hidden = Boolean(item.hidden || !item.revealed);
    const fallbackImage = fallbackType === "strength" ? ICONS.STRENGTH : fallbackType === "weakness" ? ICONS.WEAKNESS : ICONS.LOOT;
    const hiddenLabel = game.i18n.localize("WORLD_CODEX.Hidden");

    return {
      ...item,
      hidden,
      tileImage: hidden ? PATHS.UNKNOWN : (item.image || fallbackImage),
      displayName: hidden && !this.#canEdit() ? "?" : item.name,
      tooltipTitle: hidden && !this.#canEdit() ? hiddenLabel : item.name,
      tooltipDescription: hidden && !this.#canEdit() ? "" : item.description,
      tooltipText: this.#buildTooltipText(hidden && !this.#canEdit() ? hiddenLabel : item.name, hidden && !this.#canEdit() ? "" : item.description),
      revealStateClass: item.revealed ? "world-codex-is-revealed" : "world-codex-is-unrevealed",
      revealStateLabel: game.i18n.localize(item.revealed ? "WORLD_CODEX.Revealed" : "WORLD_CODEX.Hidden"),
      toggleIcon: item.revealed ? ICONS.EYE_OPEN : ICONS.EYE_CLOSED,
      toggleTitle: item.revealed
        ? game.i18n.localize("WORLD_CODEX.Actions.Hide")
        : game.i18n.localize("WORLD_CODEX.Actions.Reveal")
    };
  }

  #buildTooltipText(title, description) {
    const cleanTitle = String(title ?? "").trim();
    const cleanDescription = String(description ?? "").trim();
    if (!cleanDescription) return cleanTitle;
    return `${cleanTitle}: ${cleanDescription}`;
  }

  #localizeMaybe(value) {
    const text = String(value ?? "");
    return text.startsWith("WORLD_CODEX.") ? game.i18n.localize(text) : text;
  }

  #getDisplayMode() {
    try {
      return game.settings.get(MODULE_ID, SETTINGS.DISPLAY_MODE) === "window" ? "window" : "overlay";
    } catch (_error) {
      return "overlay";
    }
  }

  #applyDisplayMode() {
    this.displayMode = this.#getDisplayMode();
    const overlay = this.displayMode === "overlay";
    const modeChanged = this._appliedDisplayMode !== this.displayMode;

    this.element.classList.toggle("world-codex-mode-overlay", overlay);
    this.element.classList.toggle("world-codex-mode-window", !overlay);
    this.element.classList.toggle("world-codex-gm-view", this.#canEdit());
    this.element.classList.toggle("world-codex-player-preview", Boolean(game.user?.isGM && !this.gmView));
    this.element.dataset.worldCodexDisplayMode = this.displayMode;

    if (!overlay && modeChanged) this.#centerWindowMode();
    this._appliedDisplayMode = this.displayMode;
  }

  #centerWindowMode() {
    const width = Math.min(1500, Math.max(1100, window.innerWidth - 120));
    const height = Math.min(880, Math.max(720, window.innerHeight - 100));
    this.setPosition?.({
      width,
      height,
      left: Math.max(20, Math.round((window.innerWidth - width) / 2)),
      top: Math.max(20, Math.round((window.innerHeight - height) / 2))
    });
  }

  async #toggleDisplayMode() {
    const nextMode = this.displayMode === "overlay" ? "window" : "overlay";
    await game.settings.set(MODULE_ID, SETTINGS.DISPLAY_MODE, nextMode);
    this.displayMode = nextMode;
    this.render({ force: true });
  }

  #getUiState() {
    return game.user?.getFlag(MODULE_ID, UI_STATE_FLAG) ?? {};
  }

  async #saveUiState() {
    if (!game.user) return;

    return game.user.setFlag(MODULE_ID, UI_STATE_FLAG, {
      activeTab: this.activeTab,
      selectedCreatureId: this.selectedCreatureId,
      selectedRecipeId: this.selectedRecipeId,
      searchTerms: this.searchTerms,
      collapsedSpecies: this.collapsedSpecies,
      gmView: this.gmView
    });
  }

  #canEdit() {
    return Boolean(game.user?.isGM && this.gmView);
  }

  #getDisplayData() {
    return this.#canEdit() ? WorldCodexDataStore.getFullData() : WorldCodexDataStore.getPublicData();
  }

  #getHistory() {
    const history = game.user?.getFlag(MODULE_ID, HISTORY_FLAG);
    return Array.isArray(history) ? history : [];
  }

  async #setHistory(history) {
    this.history = history.slice(0, MAX_HISTORY);
    if (game.user) await game.user.setFlag(MODULE_ID, HISTORY_FLAG, this.history);
  }

  async #addHistoryEntry(type, entry) {
    if (!entry?.id) return;

    const nextEntry = {
      type,
      id: entry.id,
      name: entry.name,
      image: entry.image,
      subtitle: type === "creature" ? entry.species : entry.category
    };

    const history = this.history.filter((item) => item.type !== type || item.id !== entry.id);
    history.unshift(nextEntry);
    await this.#setHistory(history);
  }

  #selectedCreature() {
    const data = this.#getDisplayData();
    return data.bestiary?.find((creature) => creature.id === this.selectedCreatureId) ?? null;
  }

  #selectedRecipe() {
    const data = this.#getDisplayData();
    return data.recipes?.find((recipe) => recipe.id === this.selectedRecipeId) ?? null;
  }

  #onSearchInput(event) {
    const tab = event.currentTarget.dataset.search;
    if (![TABS.BESTIARY, TABS.RECIPES].includes(tab)) return;

    this.searchTerms[tab] = event.currentTarget.value;
    this._saveUiState();
    this._renderSearch();
  }

  #toggleSpecies(speciesName) {
    if (!speciesName) return;

    if (this.collapsedSpecies[speciesName]) delete this.collapsedSpecies[speciesName];
    else this.collapsedSpecies[speciesName] = true;

    this._saveUiState();
    this.render({ force: true });
  }

  #toggleGmView() {
    if (!game.user?.isGM) return;

    this.gmView = !this.gmView;
    this._saveUiState();
    this.render({ force: true });
  }

  #activateContextMenus() {
    const ContextMenu = foundry.applications?.ux?.ContextMenu?.implementation ?? globalThis.ContextMenu;
    if (!ContextMenu) return;

    this._contextMenus = [
      new ContextMenu(this.element, ".world-codex-context-target", this.#contextMenuEntries(), { jQuery: false })
    ];
  }

  #contextMenuEntries() {
    return [
      {
        name: "WORLD_CODEX.Context.ViewImage",
        icon: '<i class="fa-solid fa-image"></i>',
        condition: (target) => Boolean(this.#targetImage(this.#asElement(target))),
        callback: (target) => {
          const element = this.#asElement(target);
          this.#openImage(this.#targetImage(element), element?.innerText?.trim());
        }
      },
      {
        name: "WORLD_CODEX.Context.EditCreature",
        icon: '<i class="fa-solid fa-pen-to-square"></i>',
        condition: (target) => this.#canEdit() && this.#asElement(target)?.dataset.contextType === "creature",
        callback: (target) => new BestiaryEditor({ creatureId: this.#asElement(target).dataset.creatureId }).render({ force: true })
      },
      {
        name: "WORLD_CODEX.Context.DuplicateCreature",
        icon: '<i class="fa-solid fa-copy"></i>',
        condition: (target) => this.#canEdit() && this.#asElement(target)?.dataset.contextType === "creature",
        callback: (target) => this.#duplicateCreature(this.#asElement(target).dataset.creatureId)
      },
      {
        name: "WORLD_CODEX.Context.DeleteCreature",
        icon: '<i class="fa-solid fa-trash"></i>',
        condition: (target) => this.#canEdit() && this.#asElement(target)?.dataset.contextType === "creature",
        callback: (target) => this.#deleteSelectedCreature(this.#asElement(target).dataset.creatureId)
      },
      {
        name: "WORLD_CODEX.Context.EditRecipe",
        icon: '<i class="fa-solid fa-pen-to-square"></i>',
        condition: (target) => this.#canEdit() && this.#asElement(target)?.dataset.contextType === "recipe",
        callback: (target) => new RecipeEditor({ recipeId: this.#asElement(target).dataset.recipeId }).render({ force: true })
      },
      {
        name: "WORLD_CODEX.Context.DuplicateRecipe",
        icon: '<i class="fa-solid fa-copy"></i>',
        condition: (target) => this.#canEdit() && this.#asElement(target)?.dataset.contextType === "recipe",
        callback: (target) => this.#duplicateRecipe(this.#asElement(target).dataset.recipeId)
      },
      {
        name: "WORLD_CODEX.Context.DeleteRecipe",
        icon: '<i class="fa-solid fa-trash"></i>',
        condition: (target) => this.#canEdit() && this.#asElement(target)?.dataset.contextType === "recipe",
        callback: (target) => this.#deleteSelectedRecipe(this.#asElement(target).dataset.recipeId)
      },
      {
        name: "WORLD_CODEX.Context.ToggleReveal",
        icon: '<i class="fa-solid fa-eye"></i>',
        condition: (target) => {
          const type = this.#asElement(target)?.dataset.contextType;
          return this.#canEdit() && ["loot", "trait"].includes(type);
        },
        callback: (target) => {
          const element = this.#asElement(target);
          return WorldCodexDataStore.toggleCreatureItem(this.selectedCreatureId, element.dataset.collection, element.dataset.itemId);
        }
      },
      {
        name: "WORLD_CODEX.Context.EditEntry",
        icon: '<i class="fa-solid fa-pen-to-square"></i>',
        condition: (target) => {
          const type = this.#asElement(target)?.dataset.contextType;
          return this.#canEdit() && ["loot", "trait"].includes(type);
        },
        callback: () => new BestiaryEditor({ creatureId: this.selectedCreatureId }).render({ force: true })
      },
      {
        name: "WORLD_CODEX.Context.DeleteEntry",
        icon: '<i class="fa-solid fa-trash"></i>',
        condition: (target) => {
          const type = this.#asElement(target)?.dataset.contextType;
          return this.#canEdit() && ["loot", "trait"].includes(type);
        },
        callback: (target) => this.#deleteCreatureItem(this.#asElement(target))
      }
    ];
  }

  #asElement(target) {
    if (target instanceof HTMLElement) return target;
    return target?.[0] ?? null;
  }

  #targetImage(element) {
    return element?.querySelector("img")?.dataset.imageSrc ?? element?.querySelector("img")?.src ?? "";
  }

  #onKeydown(event) {
    if (event.key !== "Escape" || !this.rendered) return;
    if (event.defaultPrevented) return;

    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  async #onAction(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const action = button.dataset.action;

    switch (action) {
      case "tab":
        this.activeTab = button.dataset.tab || TABS.BESTIARY;
        this._saveUiState();
        this.render({ force: true });
        break;
      case "toggle-display-mode":
        await this.#toggleDisplayMode();
        break;
      case "toggle-gm-view":
        this.#toggleGmView();
        break;
      case "close-codex":
        this.close();
        break;
      case "select-creature":
        this.selectedCreatureId = button.dataset.creatureId;
        await this.#addHistoryEntry("creature", this.#selectedCreature());
        this._saveUiState();
        this.render({ force: true });
        break;
      case "toggle-species":
        this.#toggleSpecies(button.dataset.species);
        break;
      case "select-recipe":
        this.selectedRecipeId = button.dataset.recipeId;
        await this.#addHistoryEntry("recipe", this.#selectedRecipe());
        this._saveUiState();
        this.render({ force: true });
        break;
      case "select-history":
        await this.#selectHistory(button.dataset.historyType, button.dataset.entryId);
        break;
      case "clear-search":
        this.searchTerms[button.dataset.tab] = "";
        this._saveUiState();
        this.render({ force: true });
        break;
      case "open-image":
        this.#openImage(button.dataset.imageSrc, button.dataset.imageTitle);
        break;
      case "add-creature":
        new BestiaryEditor().render({ force: true });
        break;
      case "edit-creature":
      case "edit-creature-item":
        new BestiaryEditor({ creatureId: this.selectedCreatureId }).render({ force: true });
        break;
      case "delete-creature":
        await this.#deleteSelectedCreature();
        break;
      case "toggle-creature":
        await WorldCodexDataStore.toggleCreatureRevealed(this.selectedCreatureId);
        break;
      case "toggle-creature-item":
        await WorldCodexDataStore.toggleCreatureItem(this.selectedCreatureId, button.dataset.collection, button.dataset.itemId);
        break;
      case "toggle-system-section":
        await WorldCodexDataStore.toggleCreatureSystemSection(this.selectedCreatureId, button.dataset.sectionId);
        break;
      case "toggle-system-row":
        await WorldCodexDataStore.toggleCreatureSystemRow(this.selectedCreatureId, button.dataset.sectionId, button.dataset.rowId);
        break;
      case "set-creature-section":
        await WorldCodexDataStore.setCreatureSectionRevealed(this.selectedCreatureId, button.dataset.section, button.dataset.revealed === "true");
        break;
      case "delete-creature-item":
        await this.#deleteCreatureItem(button);
        break;
      case "add-recipe":
        new RecipeEditor().render({ force: true });
        break;
      case "edit-recipe":
        new RecipeEditor({ recipeId: this.selectedRecipeId }).render({ force: true });
        break;
      case "delete-recipe":
        await this.#deleteSelectedRecipe();
        break;
    }
  }

  async #duplicateCreature(creatureId) {
    if (!game.user?.isGM) return;
    const source = WorldCodexDataStore.getFullData().bestiary.find((creature) => creature.id === creatureId);
    if (!source) return;

    const duplicate = WorldCodexDataStore.clone(source);
    duplicate.id = createWorldCodexId();
    duplicate.name = game.i18n.format("WORLD_CODEX.CopyOf", { name: source.name });
    duplicate.loot = duplicate.loot.map((item) => ({ ...item, id: createWorldCodexId() }));
    duplicate.traits = duplicate.traits.map((item) => ({ ...item, id: createWorldCodexId() }));
    await WorldCodexDataStore.upsertCreature(duplicate);
    this.selectedCreatureId = duplicate.id;
    await this.#addHistoryEntry("creature", duplicate);
    this._saveUiState();
  }

  async #duplicateRecipe(recipeId) {
    if (!game.user?.isGM) return;
    const source = WorldCodexDataStore.getFullData().recipes.find((recipe) => recipe.id === recipeId);
    if (!source) return;

    const duplicate = WorldCodexDataStore.clone(source);
    duplicate.id = createWorldCodexId();
    duplicate.name = game.i18n.format("WORLD_CODEX.CopyOf", { name: source.name });
    duplicate.ingredients = duplicate.ingredients.map((item) => ({ ...item, id: createWorldCodexId() }));
    await WorldCodexDataStore.upsertRecipe(duplicate);
    this.selectedRecipeId = duplicate.id;
    await this.#addHistoryEntry("recipe", duplicate);
    this._saveUiState();
  }

  async #selectHistory(type, entryId) {
    if (type === "creature") {
      this.activeTab = TABS.BESTIARY;
      this.selectedCreatureId = entryId;
      const creature = this.#selectedCreature();
      if (creature?.species) delete this.collapsedSpecies[creature.species];
      await this.#addHistoryEntry(type, creature);
    } else if (type === "recipe") {
      this.activeTab = TABS.RECIPES;
      this.selectedRecipeId = entryId;
      await this.#addHistoryEntry(type, this.#selectedRecipe());
    }

    this._saveUiState();
    this.render({ force: true });
  }

  #openImage(src, title = "") {
    if (!src) return;
    if (globalThis.ImagePopout) {
      new ImagePopout(src, { title }).render(true);
      return;
    }

    window.open(src, "_blank", "noopener");
  }

  async #deleteSelectedCreature(creatureId = this.selectedCreatureId) {
    if (!creatureId) return;
    const confirmed = await confirmWorldCodexAction({
      title: game.i18n.localize("WORLD_CODEX.DeleteCreature"),
      content: `<p>${game.i18n.localize("WORLD_CODEX.Confirm.DeleteCreature")}</p>`,
      yesLabel: game.i18n.localize("WORLD_CODEX.Delete")
    });
    if (!confirmed) return;

    await WorldCodexDataStore.deleteCreature(creatureId);
    this.selectedCreatureId = null;
    this._saveUiState();
  }

  async #deleteCreatureItem(button) {
    const confirmed = await confirmWorldCodexAction({
      title: game.i18n.localize("WORLD_CODEX.Delete"),
      content: `<p>${game.i18n.localize("WORLD_CODEX.Confirm.DeleteEntry")}</p>`,
      yesLabel: game.i18n.localize("WORLD_CODEX.Delete")
    });
    if (!confirmed) return;

    await WorldCodexDataStore.deleteCreatureItem(this.selectedCreatureId, button.dataset.collection, button.dataset.itemId);
  }

  async #deleteSelectedRecipe(recipeId = this.selectedRecipeId) {
    if (!recipeId) return;
    const confirmed = await confirmWorldCodexAction({
      title: game.i18n.localize("WORLD_CODEX.DeleteRecipe"),
      content: `<p>${game.i18n.localize("WORLD_CODEX.Confirm.DeleteRecipe")}</p>`,
      yesLabel: game.i18n.localize("WORLD_CODEX.Delete")
    });
    if (!confirmed) return;

    await WorldCodexDataStore.deleteRecipe(recipeId);
    this.selectedRecipeId = null;
    this._saveUiState();
  }
}
