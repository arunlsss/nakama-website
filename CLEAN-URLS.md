# Website routes and Store Overview

Store Overview contains Executive Summary, Overview, Store Performance, Product Insights, Order Health, Customer Insight and What to bundle in one document. Sidebar and mobile menu controls scroll to each section. The five sales sections share the selected dates and business filters. Customer and bundle reports retain their own filters inside the page. Inventory, Advertising, Data Coverage and Import History remain separate workspace pages.

The website uses directory routes, for example `/management/` and `/products/`. Older `.html` addresses still load the original page and update the address without a second load, preserving query parameters and section anchors. Local resources and workspace frames use root paths so direct refreshes and upload workers work from directory routes.

Edit the root HTML files as the source, then run `npm run build:urls` before publishing. This generates the directory `index.html` files needed by GitHub Pages. The route tests reject stale generated pages. No hosting provider or access permissions need to change.
