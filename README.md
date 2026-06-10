# World Codex

World Codex is a system-agnostic Foundry VTT module for a dark fantasy bestiary and recipe codex.

## Enable the module

1. Start your world.
2. Open **Game Settings**.
3. Open **Manage Modules**.
4. Enable **World Codex**.
5. Save module settings and reload the world when Foundry asks.

## Open the codex

You have three ways to open it:

1. Use the **book icon** in the left scene controls.
   - In Foundry v13/v14 this appears as its own **World Codex** control group.
   - If Foundry opens a small tool palette, click **Open World Codex**.
2. Select the normal **Token Controls** group and click the book tool there.
3. Press **F9**.

The F9 keybinding can be changed from **Game Settings > Configure Controls > World Codex**.

## Overlay and window mode

World Codex opens as a full-screen overlay by default.

Use the top-right mode button inside the codex to switch between:

- **Full-screen overlay**: fills the Foundry viewport and hides the normal Foundry window frame.
- **Window**: a draggable, resizable Foundry application window.

Your choice is saved as a client setting named `world-codex.displayMode`, so each user can keep their preferred mode.

In overlay mode, use the top-right **X** button, press **Escape**, or press **F9** again to close the codex.

GM add/edit dialogs, image pickers, and confirmation dialogs are designed to open above the full-screen overlay, so you should not need to switch back to window mode just to edit an entry.

## Navigation shortcuts

- Search the Bestiary or Recipes from the left column search box.
- Click species headers in the Bestiary list to collapse or expand them.
- Right-click creatures, recipes, loot, weaknesses, or strengths for quick actions.
- Click codex images to open a larger image popout.
- Use the recently viewed strip in the header to jump back to entries you opened earlier.

You can also test it from the browser console:

```js
game.worldCodex.toggle()
```

## GM controls

GMs see buttons for:

- Adding, editing, and deleting creatures.
- Adding, editing, and deleting recipes.
- Switching between **GM View** and **Player View** inside the codex. Player View uses the sanitized public data, so it previews what players can actually see.
- Hiding or revealing an entire creature from the Bestiary.
- Revealing or hiding all loot, weaknesses, or strengths in a selected creature section.
- Revealing or hiding individual loot, weaknesses, and strengths.
- Opening the species manager from **Game Settings > Configure Settings > Module Settings > World Codex Species**.

Players can open the codex, but only receive the public sanitized data. Hidden loot, weaknesses, and strengths render as unknown `?` tiles.

## System profiles and actor import

World Codex is still system-agnostic at its core, but GMs can choose a rules profile from **Game Settings > Configure Settings > Module Settings > World Codex System Profile**.

Available profiles:

- **Auto: Current System**
- **Generic**
- **D&D 5e**
- **Fabula Ultima**

When editing or adding a creature, use the **Actor Link** section to choose an Actor and press **Import Actor Data**. World Codex copies useful actor data into the codex entry, including profile-specific sections such as HP, MP, AC/DEF, attacks, spells, resistances, affinities, and similar fields where the selected profile can find them.

Imported actor data is stored as codex data. Players do not read the source Actor document, and hidden imported sections are stripped from public data until the GM reveals them.

## Data storage

The module stores data in world-level settings:

- `world-codex.species`
- `world-codex.fullData`
- `world-codex.publicData`

`fullData` is used by GMs. `publicData` is rebuilt after GM edits and is the only data used for player rendering.

## Troubleshooting

If the control does not appear:

1. Confirm **World Codex** is enabled in **Manage Modules** for the current world.
2. Reload the world after enabling the module.
3. Make sure you are viewing an active scene, since scene controls are scene UI.
4. Try **F9**.
5. Open the browser console and run:

```js
game.worldCodex.toggle()
```

If the console says `game.worldCodex` is undefined, the module script did not load. Check the console for the first red error and reload after fixing it.
