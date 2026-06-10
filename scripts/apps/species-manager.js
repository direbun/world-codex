import { ICONS, TEMPLATES, UNCATEGORIZED } from "../constants.js";
import { confirmWorldCodexAction, createWorldCodexId, WorldCodexDataStore } from "../datastore.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const BaseApplication = HandlebarsApplicationMixin(ApplicationV2);

export class SpeciesManager extends BaseApplication {
  static DEFAULT_OPTIONS = {
    id: "world-codex-species-manager",
    classes: ["world-codex-window", "world-codex-editor-window"],
    tag: "section",
    window: {
      title: "WORLD_CODEX.ConfigureSpecies",
      icon: "fa-solid fa-list",
      resizable: true
    },
    position: {
      width: 560,
      height: 620
    }
  };

  static PARTS = {
    body: {
      template: TEMPLATES.SPECIES_MANAGER
    }
  };

  constructor(options = {}) {
    super(options);
    this.rows = WorldCodexDataStore.getSpecies().map((name) => ({
      id: createWorldCodexId(),
      name,
      original: name
    }));
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      icons: ICONS,
      species: this.rows.map((row, index) => ({
        ...row,
        canMoveUp: index > 0,
        canMoveDown: index < this.rows.length - 1
      }))
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const form = this.element.querySelector("form");
    form?.addEventListener("submit", (event) => this.#save(event));

    for (const element of this.element.querySelectorAll("[data-action]")) {
      element.addEventListener("click", (event) => this.#onAction(event));
    }
  }

  async #onAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const rowId = button.dataset.rowId;

    switch (button.dataset.action) {
      case "add-species":
        this.#syncRowsFromForm();
        this.rows.push({
          id: createWorldCodexId(),
          name: "",
          original: null
        });
        this.render({ force: true });
        break;
      case "delete-species":
        await this.#deleteSpecies(rowId);
        break;
      case "move-up":
        this.#move(rowId, -1);
        break;
      case "move-down":
        this.#move(rowId, 1);
        break;
    }
  }

  async #deleteSpecies(rowId) {
    this.#syncRowsFromForm();
    const row = this.rows.find((entry) => entry.id === rowId);
    if (!row) return;

    const assignedName = row.original || row.name;
    const assignedCount = assignedName ? WorldCodexDataStore.countCreaturesBySpecies(assignedName) : 0;
    if (assignedCount > 0) {
      const confirmed = await confirmWorldCodexAction({
        title: game.i18n.localize("WORLD_CODEX.ConfigureSpecies"),
        content: `<p>${game.i18n.format("WORLD_CODEX.Confirm.DeleteSpecies", { count: assignedCount, species: assignedName })}</p>`,
        yesLabel: game.i18n.localize("WORLD_CODEX.Actions.MoveToUncategorized")
      });
      if (!confirmed) return;

      await WorldCodexDataStore.moveSpeciesCreatures(assignedName, UNCATEGORIZED);
      if (!this.rows.some((entry) => entry.name === UNCATEGORIZED || entry.original === UNCATEGORIZED)) {
        this.rows.push({
          id: createWorldCodexId(),
          name: UNCATEGORIZED,
          original: UNCATEGORIZED
        });
      }
    }

    this.rows = this.rows.filter((entry) => entry.id !== rowId);
    this.render({ force: true });
  }

  #move(rowId, direction) {
    this.#syncRowsFromForm();
    const index = this.rows.findIndex((row) => row.id === rowId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= this.rows.length) return;

    const [row] = this.rows.splice(index, 1);
    this.rows.splice(target, 0, row);
    this.render({ force: true });
  }

  async #save(event) {
    event.preventDefault();
    this.#syncRowsFromForm();

    const names = [];
    const seen = new Set();
    for (const row of this.rows) {
      const name = row.name.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);

      if (row.original && row.original !== name) {
        await WorldCodexDataStore.renameSpecies(row.original, name);
        row.original = name;
      }
    }

    if (!names.length) {
      ui.notifications?.error(game.i18n.localize("WORLD_CODEX.Errors.SpeciesRequired"));
      return;
    }

    await WorldCodexDataStore.setSpecies(names);
    ui.notifications?.info(game.i18n.localize("WORLD_CODEX.Notifications.Saved"));
    this.close();
  }

  #syncRowsFromForm() {
    const form = this.element?.querySelector("form");
    if (!form) return;

    const formData = new FormData(form);
    this.rows = this.rows.map((row) => ({
      ...row,
      name: String(formData.get(`species.${row.id}.name`) ?? "").trim()
    }));
  }
}
