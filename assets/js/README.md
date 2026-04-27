# JavaScript Module Structure

This directory contains a modular, component-based JavaScript architecture for the Snooker League website.

## Directory Structure

```
assets/js/
├── config/
│   └── app-config.js          # AppConfig.apiUrl → Supabase bgs-api Edge Function
├── utils/
│   ├── bgs-data.js            # GET helpers for bgs-api (fixtures, handicaps, etc.)
│   ├── api-client.js          # POST/GET to bgs-api (scores)
│   ├── csv-loader.js          # CSV loading utility (PapaParse wrapper; optional legacy)
│   ├── formatters.js          # Data formatting helpers
│   └── image-loader.js        # Image loading utility
├── components/
│   ├── knockout-renderer.js   # Reusable knockout tournament display component
│   └── league-standings.js    # Reusable league standings display component
├── pages/
│   ├── index.js               # Home page (knockout display)
│   ├── fixtures.js            # Fixtures page
│   ├── results.js             # Results page
│   ├── leagues.js             # Leagues page
│   ├── handicaps.js           # Handicaps page
│   ├── under-development.js   # Under development page
│   └── league-leaders.js      # League leaders placeholder replacement
└── main.js                    # Main entry point & page router
```

## Backend configuration

1. Deploy `bgs-api` (see `docs/SUPABASE_CUTOVER_RUNBOOK.md`).
2. Set `AppConfig.apiUrl` in `config/app-config.js` to your function URL.
3. Optional: import sheet data with `scripts/migrate-sheets-to-supabase.mjs`.

## Script Loading Order (in HTML)

Scripts must be loaded in this order:

1. Configuration (`config/app-config.js`, then other config)
2. Utilities (`utils/api-client.js`, `utils/bgs-data.js`, …)
4. Components (`components/*.js`)
5. Page modules (`pages/*.js`)
6. Main entry point (`main.js`)

## Benefits

- **Single Source of Truth**: Each component/utility exists in one place
- **No Duplication**: Common code is extracted to reusable modules
- **Easy Debugging**: Smaller, focused files make issues easier to find
- **Better AI Efficiency**: Smaller context windows for code changes
- **Scalable**: Easy to add new pages or components
- **Maintainable**: Clear separation of concerns

## Adding a New Page

1. Create a new file in `pages/` (e.g., `pages/my-new-page.js`)
2. Export a module with an `init()` method
3. Add page detection logic in `main.js`
4. Add the script tag to your HTML file

## Module Dependencies

- All modules depend on utilities and config
- Page modules depend on components and utilities
- Main.js depends on all page modules