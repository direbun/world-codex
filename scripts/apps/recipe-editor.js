import { ICONS, PATHS, TEMPLATES } from "../constants.js";
import { confirmWorldCodexAction, createWorldCodexId, WorldCodexDataStore } from "../datastore.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const BaseApplication = HandlebarsApplicationMixin(ApplicationV2);

export class RecipeEditor extends BaseApplication {
  static DEFAULT_OPTIONS = {
    classes: ["world-codex-window", "world-codex-editor-window"],
    tag: "section",
    window: {
      title: "WORLD_CODEX.EditRecipe",
      icon: "fa-solid fa-flask",
      resizable: true
    },
    position: {
      width: 760,
      height: 780
    }
  };

  static PARTS = {
    body: {
      template: TEMPLATES.RECIPE_EDITOR
    }
  };

  constructor({ recipeId = null } = {}, options = {}) {
    super(options);
    this.recipeId = recipeId;
    this.isNew = !recipeId;
    this.draft = this.#loadDraft(recipeId);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      isNew: this.isNew,
      recipe: this.draft,
      ingredients: this.draft.ingredients,
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

  #loadDraft(recipeId) {
    const recipe = WorldCodexDataStore.getFullData().recipes.find((entry) => entry.id === recipeId);
    if (recipe) return WorldCodexDataStore.clone(recipe);

    return {
      id: createWorldCodexId(),
      name: "",
      category: "General",
      image: PATHS.DEFAULT_RECIPE,
      description: "",
      ingredients: [],
      result: {
        name: "",
        image: PATHS.DEFAULT_RECIPE,
        description: ""
      },
      revealed: false
    };
  }

  async #onAction(event) {
    event.preventDefault();
    const button = event.currentTarget;

    switch (button.dataset.action) {
      case "pick-image":
        this.#pickImage(button.dataset.target);
        break;
      case "add-ingredient":
        this.#syncDraftFromForm();
        this.draft.ingredients.push({
          id: createWorldCodexId(),
          name: "",
          image: ICONS.RECIPE,
          quantity: "",
          description: ""
        });
        this.render({ force: true });
        break;
      case "delete-ingredient":
        this.#syncDraftFromForm();
        this.draft.ingredients = this.draft.ingredients.filter((item) => item.id !== button.dataset.itemId);
        this.render({ force: true });
        break;
      case "delete-recipe":
        await this.#deleteRecipe();
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

  async #save(event) {
    event.preventDefault();
    this.#syncDraftFromForm();

    if (!this.draft.name) {
      ui.notifications?.error(game.i18n.localize("WORLD_CODEX.Errors.NameRequired"));
      return;
    }

    await WorldCodexDataStore.upsertRecipe(this.draft);
    this.close();
  }

  async #deleteRecipe() {
    const confirmed = await confirmWorldCodexAction({
      title: game.i18n.localize("WORLD_CODEX.DeleteRecipe"),
      content: `<p>${game.i18n.localize("WORLD_CODEX.Confirm.DeleteRecipe")}</p>`,
      yesLabel: game.i18n.localize("WORLD_CODEX.Delete")
    });
    if (!confirmed) return;

    await WorldCodexDataStore.deleteRecipe(this.draft.id);
    this.close();
  }

  #syncDraftFromForm() {
    const form = this.element?.querySelector("form");
    if (!form) return;

    const formData = new FormData(form);
    this.draft.name = String(formData.get("name") ?? "").trim();
    this.draft.category = String(formData.get("category") ?? "General").trim() || "General";
    this.draft.image = String(formData.get("image") ?? PATHS.DEFAULT_RECIPE).trim() || PATHS.DEFAULT_RECIPE;
    this.draft.description = String(formData.get("description") ?? "");
    this.draft.revealed = formData.get("revealed") === "on";
    this.draft.ingredients = this.draft.ingredients.map((item) => ({
      id: item.id,
      name: String(formData.get(`ingredients.${item.id}.name`) ?? "").trim(),
      image: String(formData.get(`ingredients.${item.id}.image`) ?? ICONS.RECIPE).trim() || ICONS.RECIPE,
      quantity: String(formData.get(`ingredients.${item.id}.quantity`) ?? "").trim(),
      description: String(formData.get(`ingredients.${item.id}.description`) ?? "")
    }));
    this.draft.result = {
      name: String(formData.get("result.name") ?? "").trim(),
      image: String(formData.get("result.image") ?? PATHS.DEFAULT_RECIPE).trim() || PATHS.DEFAULT_RECIPE,
      description: String(formData.get("result.description") ?? "")
    };
  }
}
