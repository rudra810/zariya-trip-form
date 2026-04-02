# Zariya Clone Deploy Checklist

## 1) Theme deployment
- [ ] Install Shopify CLI and login
- [ ] Run `shopify theme push --unpublished --store YOUR-STORE.myshopify.com`
- [ ] Open preview link and verify homepage renders with hero + featured collection + trust sections

## 2) Catalog migration
- [ ] Import full products CSV (not inventory-only CSV)
- [ ] Import/update inventory using `source-export/inventory_export_1.csv`
- [ ] Confirm product count and variant count in admin match source

## 3) Navigation and pages
- [ ] Recreate main menu (`Home`, `Collection`, `Contact`) if needed
- [ ] Recreate policy pages and footer links
- [ ] Verify contact page form fields and styling

## 4) Visual parity checks (source vs clone)
- [ ] Header: centered logo, left nav links, right icons
- [ ] Home hero typography and spacing
- [ ] Product cards: dark gradient card, discount badge, price styling
- [ ] Collection page filters and sort dropdown layout
- [ ] Product page: variant pills, quantity, CTA bar, trust icons
- [ ] Footer: contact block and social links

## 5) App-dependent blocks
- [ ] Judge.me review badge block loads on product page
- [ ] Judge.me review widget loads below product details
- [ ] Remove or replace app blocks if app not installed in target store

## 6) Final QA
- [ ] Desktop checks (1920x1080 and 1366x768)
- [ ] Mobile checks (390x844 and 360x800)
- [ ] Test add-to-cart from product and collection
- [ ] Verify no broken images or missing section assets
