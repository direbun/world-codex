import { ICONS, PATHS, TEMPLATES, UNCATEGORIZED } from "../constants.js";
import { confirmWorldCodexAction, createWorldCodexId, WorldCodexDataStore } from "../datastore.js";
import { actorToCreatureDraft, getWorldCodexSystemProfile, getWorldCodexSystemProfileLabel } from "../system-profiles.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const BaseApplication = HandlebarsApplicationMixin(ApplicationV2);

export class BestiaryEditor extends BaseApplication {
  static DEFAULT_OPTIONS = {
    classes: ["world-codex-window", "world-codex-editor-window"],
    tag: "section",
    window: {
      title: "WORLD_CODEX.EditCreature",
      icon: "fa-solid fa-dragon",
      resizable: true
    },
    position: {
      width: 760,
      height: 820
    }
  };

  static PARTS = {
    body: {
      template: TEMPLATES.BESTIARY_EDITOR
    }
  };

  constructor({ creatureId = null } = {}, options = {}) {
    super(options);
    this.creatureId = creatureId;
    this.isNew = !creatureId;
    this.draft = this.#loadDraft(creatureId);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const species = WorldCodexDataStore.getSpecies();
    if (!species.includes(UNCATEGORIZED)) species.push(UNCATEGORIZED);

    return {
      ...context,
      isNew: this.isNew,
      creature: this.draft,
      actorOptions: this.#actorOptions(),
      hasActorLink: Boolean(this.draft.actorUuid),
      systemProfile: getWorldCodexSystemProfile(),
      systemProfileLabel: getWorldCodexSystemProfileLabel(),
      systemSectionCount: this.draft.systemProfileData?.sections?.length ?? 0,
      loot: this.draft.loot,
      weaknesses: this.draft.traits.filter((trait) => trait.type === "weakness"),
      strengths: this.draft.traits.filter((trait) => trait.type === "strength"),
      speciesOptions: species.map((entry) => ({
        value: entry,
        label: entry,
        selected: entry === this.draft.species
      })),
      icons: ICONS
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

  #loadDraft(creatureId) {
    const creature = WorldCodexDataStore.getFullData().bestiary.find((entry) => entry.id === creatureId);
    if (creature) return WorldCodexDataStore.clone(creature);

    return {
      id: createWorldCodexId(),
      name: "",
      revealed: true,
      actorUuid: "",
      actorName: "",
      actorType: "",
      systemProfile: getWorldCodexSystemProfile(),
      systemProfileData: {
        profile: getWorldCodexSystemProfile(),
        profileLabel: getWorldCodexSystemProfileLabel(),
        actorUuid: "",
        actorName: "",
        actorType: "",
        sections: []
      },
      species: WorldCodexDataStore.getSpecies()[0] ?? UNCATEGORIZED,
      image: PATHS.DEFAULT_CREATURE,
      description: "",
      gmNotes: "",
      loot: [],
      traits: []
    };
  }

  async #onAction(event) {
    event.preventDefault();
    const button = event.currentTarget;

    switch (button.dataset.action) {
      case "pick-image":
        this.#pickImage(button.dataset.target);
        break;
      case "import-actor":
        await this.#importActorData();
        break;
      case "add-loot":
        this.#syncDraftFromForm();
        this.draft.loot.push({
          id: createWorldCodexId(),
          name: "",
          image: ICONS.LOOT,
          description: "",
          revealed: false
        });
        this.render({ force: true });
        break;
      case "add-weakness":
      case "add-strength":
        this.#syncDraftFromForm();
        this.draft.traits.push({
          id: createWorldCodexId(),
          type: button.dataset.action === "add-strength" ? "strength" : "weakness",
          name: "",
          image: button.dataset.action === "add-strength" ? ICONS.STRENGTH : ICONS.WEAKNESS,
          description: "",
          revealed: false
        });
        this.render({ force: true });
        break;
      case "delete-loot":
        this.#syncDraftFromForm();
        this.draft.loot = this.draft.loot.filter((item) => item.id !== button.dataset.itemId);
        this.render({ force: true });
        break;
      case "delete-trait":
        this.#syncDraftFromForm();
        this.draft.traits = this.draft.traits.filter((item) => item.id !== button.dataset.itemId);
        this.render({ force: true });
        break;
      case "delete-creature":
        await this.#deleteCreature();
        break;
    }
  }

  #pickImage(targetName) {
    const form = this.element.querySelector("form");
    const input = [...form.elements].find((element) => element.name === targetName);
    if (!input) return;

    new FilePicker({
      type: "image",
      current: input.value,
      callback: (path) => {
        input.value = path;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        const preview = input.closest(".world-codex-field-row")?.querySelector(".world-codex-image-preview");
        if (preview) preview.src = path;
      }
    }).render(true);
  }

  async #importActorData() {
    this.#syncDraftFromForm();
    if (!this.draft.actorUuid) {
      ui.notifications?.warn(game.i18n.localize("WORLD_CODEX.Errors.ActorRequired"));
      return;
    }

    const imported = await actorToCreatureDraft(this.draft.actorUuid, getWorldCodexSystemProfile());
    if (!imported) {
      ui.notifications?.error(game.i18n.localize("WORLD_CODEX.Errors.ActorNotFound"));
      return;
    }

    this.draft = {
      ...this.draft,
      ...imported,
      name: imported.name || this.draft.name,
      image: imported.image || this.draft.image,
      description: imported.description || this.draft.description,
      systemProfileData: this.#mergeSystemProfileReveals(imported.systemProfileData, this.draft.systemProfileData)
    };
    ui.notifications?.info(game.i18n.localize("WORLD_CODEX.Notifications.ActorImported"));
    this.render({ force: true });
  }

  #mergeSystemProfileReveals(nextData = {}, previousData = {}) {
    const previousSections = new Map((previousData.sections ?? []).map((section) => [section.id, section]));

    return {
      ...nextData,
      sections: (nextData.sections ?? []).map((section) => {
        const previousSection = previousSections.get(section.id);
        const previousRows = new Map((previousSection?.rows ?? []).map((row) => [row.id, row]));

        return {
          ...section,
          revealed: previousSection?.revealed ?? section.revealed,
          rows: (section.rows ?? []).map((row) => {
            const previousRow = previousRows.get(row.id);
            const revealed = typeof previousRow?.revealed === "boolean"
              ? previousRow.revealed
              : typeof previousSection?.revealed === "boolean"
                ? previousSection.revealed
                : row.revealed;

            return {
              ...row,
              revealed
            };
          })
        };
      })
    };
  }

  async #save(event) {
    event.preventDefault();
    this.#syncDraftFromForm();

    if (!this.draft.name) {
      ui.notifications?.error(game.i18n.localize("WORLD_CODEX.Errors.NameRequired"));
      return;
    }

    await WorldCodexDataStore.upsertCreature(this.draft);
    this.close();
  }

  async #deleteCreature() {
    const confirmed = await confirmWorldCodexAction({
      title: game.i18n.localize("WORLD_CODEX.DeleteCreature"),
      content: `<p>${game.i18n.localize("WORLD_CODEX.Confirm.DeleteCreature")}</p>`,
      yesLabel: game.i18n.localize("WORLD_CODEX.Delete")
    });
    if (!confirmed) return;

    await WorldCodexDataStore.deleteCreature(this.draft.id);
    this.close();
  }

  #syncDraftFromForm() {
    const form = this.element?.querySelector("form");
    if (!form) return;

    const formData = new FormData(form);
    this.draft.name = String(formData.get("name") ?? "").trim();
    this.draft.revealed = formData.get("revealed") === "on";
    this.draft.actorUuid = String(formData.get("actorUuid") ?? "").trim();
    this.draft.species = String(formData.get("species") ?? UNCATEGORIZED).trim() || UNCATEGORIZED;
    this.draft.image = String(formData.get("image") ?? PATHS.DEFAULT_CREATURE).trim() || PATHS.DEFAULT_CREATURE;
    this.draft.description = String(formData.get("description") ?? "");
    this.draft.gmNotes = String(formData.get("gmNotes") ?? "");
    this.draft.loot = this.draft.loot.map((item) => ({
      id: item.id,
      name: String(formData.get(`loot.${item.id}.name`) ?? "").trim(),
      image: String(formData.get(`loot.${item.id}.image`) ?? ICONS.LOOT).trim() || ICONS.LOOT,
      description: String(formData.get(`loot.${item.id}.description`) ?? ""),
      revealed: formData.get(`loot.${item.id}.revealed`) === "on"
    }));
    this.draft.traits = this.draft.traits.map((item) => ({
      id: item.id,
      type: item.type === "strength" ? "strength" : "weakness",
      name: String(formData.get(`traits.${item.id}.name`) ?? "").trim(),
      image: String(formData.get(`traits.${item.id}.image`) ?? (item.type === "strength" ? ICONS.STRENGTH : ICONS.WEAKNESS)).trim() || (item.type === "strength" ? ICONS.STRENGTH : ICONS.WEAKNESS),
      description: String(formData.get(`traits.${item.id}.description`) ?? ""),
      revealed: formData.get(`traits.${item.id}.revealed`) === "on"
    }));
  }

  #actorOptions() {
    const actors = (game.actors?.contents ?? Array.from(game.actors ?? []))
      .sort((left, right) => left.name.localeCompare(right.name, game.i18n.lang))
      .map((actor) => ({
        uuid: actor.uuid,
        name: actor.name,
        type: actor.type,
        selected: actor.uuid === this.draft.actorUuid
      }));

    return [
      {
        uuid: "",
        name: game.i18n.localize("WORLD_CODEX.ActorLink.None"),
        type: "",
        selected: !this.draft.actorUuid
      },
      ...actors
    ];
  }
}
