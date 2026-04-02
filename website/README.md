# Zariya Shopify Clone (Applied Source Export)

This workspace now uses the real Shopify theme export from source store `zariyaofficial.com`.

## Current status
- Source theme export has been unpacked to `source-export/`.
- Active project folders (`assets`, `config`, `layout`, `locales`, `sections`, `snippets`, `templates`) were replaced with the exported theme files.
- Provided inventory export is available at `source-export/inventory_export_1.csv`.
- Inventory file currently contains `37` unique product handles.

## Included in this clone baseline
- Homepage sections and ordering from source theme settings.
- Collection template and filter/sort configuration.
- Product template with app blocks and related products section.
- Header/footer/menu rendering logic from source theme.
- Source theme settings files including `config/settings_data.json`.

## Remaining data needed for full catalog migration on a new store
- Full products export CSV (title/body/images/pricing/variants/metafields/SEO).
- Collections/pages/menu/policies exports (if not fully represented in target admin).
- Any unpublished/draft products and hidden collections export.

## Deploy and preview
```powershell
# Run from this folder
shopify theme dev --store YOUR-STORE.myshopify.com

# Push as unpublished theme
shopify theme push --unpublished --store YOUR-STORE.myshopify.com
```

## Notes
- The provided `inventory_export_1.csv` is inventory-only and cannot by itself recreate full products on a brand-new store.
- Use this theme plus a full products CSV for a complete storefront + catalog clone.
