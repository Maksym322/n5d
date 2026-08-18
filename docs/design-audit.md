# Design Audit - N5Deal Listing Page

## Corrections
- Earlier notes claimed listing metrics included Revenue, MRR, or Profit; superseded by direct inspection.
- Earlier notes claimed desktop layout allowed 1 to 2 cards per row; superseded by direct inspection (it is a full-width row layout).

## A. Listing layout
- **Row vs Grid:** Each listing is a horizontal full-width ROW.
  - *Earlier notes claimed desktop layout allowed 1 to 2 cards per row; superseded by direct inspection.*
- **Visible per screen:** 4 listings are visible in the full-page screenshot.
- **Container / Background / Separators:** The container max-width is approximately 1240px. The page background is white or a very light gray. Each listing card is separated by a vertical gap (approx 24px-30px), and has a subtle rounded border and a faint drop shadow.
- **Navigation Layout (from earlier pass — unverified):** Features a glassmorphic floating header (`liquid-glass-button`, `backdrop-blur-[14px]`) fixed at the top.

## B. Anatomy of ONE listing — exhaustive
Based on "Asset ID #793":

1. **Left Column (approx 152px wide):**
   - **Image:** A thumbnail (136x78px - *from earlier pass — unverified*) containing a country flag (South Africa), rounded corners (approx 12px), faint drop shadow.
   - **Date:** Text "Date: Aug 2026" (positioned below the image, bold, secondary gray text).

2. **Middle Column (Content):**
   - **Title:** "Asset ID #793" (large, bold, dark navy/black).
   - **Status Badge:** A checkmark icon followed by "Validated" (small, bold, green, right-aligned next to the title).
   - **Attribute Grid:** A 2-row table-like layout with faint gray borders dividing the columns and rows.
     *Earlier notes claimed listing metrics included Revenue, MRR, or Profit; superseded by direct inspection.*
     
     | Label | Example Value | Row | Column |
     | --- | --- | --- | --- |
     | Country | ZA | 1 | 1 |
     | Type of License | FSP | 1 | 2 |
     | Type of Business | Forex | 1 | 3 |
     | Status | Not active (red text) | 1 | 4 |
     | Asking Price | $130.0K (large, blue) | 1 | 5 (spans height) |
     | Asset Type ⓘ | License only | 2 | 1 |
     | Employees | N/A | 2 | 2 |
     | Year of Issue | N/A | 2 | 3 |
     | Regulatory | FSCA | 2 | 4 |

   - **Tags Section:** Label "Included" followed by pill-shaped tags: "Crypto Assets S...", "Full Capital Mar...", "Structured Stan..." and a blue button reading "+2" with a 3-dot menu icon.
   - **Description:** "South African Category I FSP licensed for non-automated advice and intermediary services acro..."
   - **Footer Meta:** "3 Views", "0 favourites" (numeric value is bold, label is regular).
   - **Action Buttons:** 
     - Outline button with an eye icon: `View Asset`
     - Filled button with a right arrow icon: `Buy ->`

3. **Right Column (Chart):**
   - The market trend chart (detailed below).

## C. The chart in each listing
- **Exact title text:** "Market Trend (2020-2025)"
- **Chart type:** Line chart (black line with circular data points).
- **Axes:** Tick labels are visible on both axes.
  - Y-axis reads: `$0K`, `$75K`, `$150K`, `$225K`, `$300K`
  - X-axis reads: `2020`, `2021`, `2022`, `2023`, `2024`, `2025`
- **Data points:** 6 data points total.
- **Size:** Approximately 250px wide by 150px tall.

## D. Seller identity — answer explicitly
Sellers appear fully anonymised. No listing displays a company name, seller name, brand, or logo identifying who is selling. The exact field shown that identifies a listing is the **"Asset ID #793"**. The visual thumbnail displays a country flag rather than a seller's logo.

## E. Filter panel
- **Placement (from earlier pass — unverified):** Positioned at the top right of the listing grid (`-top-[64px] right-[0px] lg:absolute`).
**Controls above the listings (left to right):**
- **Search bar:** Text input with a magnifying glass icon, reading `"Find the perfect Asset..."`
- **Category Facets (Pill Buttons):** 
  - `All (145)` (active state, black fill)
  - `Bank (5)`
  - `Fintech (17)`
  - `Payment (59)`
  - `EMI (27)`
  - `Crypto (23)`
  *Control type:* Button pills. A numeric count appears inside parentheses for every option.
- **Currency/Price Toggle:** Label `"Show prices in"` followed by a dropdown button reading `"Default"`.
- **Filters Toggle:** A button with a slider icon and text `"Filters"`. *(Note: Detailed facets are hidden within interactive modals and not immediately rendered in the DOM until clicked - from earlier pass — unverified).*
- **Sorting/View Toggles:** 
  - A dropdown/button with a trending-up icon reading `"Most Popular"`.
  - A dropdown reading `"Newest Listings"`.

## F. Header and navigation
**Nav items' literal text (left to right):**
- `N5deal` (Logo image)
- `Seller` (Green text)
- `Buyer` (Blue text)
- `Partner` (Purple text)
- `All Listings` (Active pill: black background, white text)
- `Incorporation License` (With a dropdown chevron)
- `Fintech Builder`
- `Resources`

**Auth / Action buttons:**
- `Free Valuation` (Outline button with a spark/star icon)
- `Start now` (Filled button with a black/gray gradient)

## G. Below the listings
- **Pagination:** Circular buttons. `1` (active, blue fill), `2`, `...`, `37`, `>` (right chevron).
- **FAQ Accordion:**
  - `"What is the All Listings page on N5Deal?"` (expanded)
  - `"What kinds of businesses appear in the listings?"` (collapsed)
  - `"How do I search the business listings effectively?"` (collapsed)
  - `"Can I list my own business in the directory?"` (collapsed)
- **Footer Content:**
  - Columns: `Sellers`, `Buyers`, `Partner`, `Incorporation License`, `Resources`, `Support`, `Social Networks`, `Asset Listings`.
  - Social icons for Instagram, LinkedIn, X, and Telegram.
  - Links include: `Sell Your Fintech`, `Browse Fintech Assets`, `Regulatory Map`, `FAQ`, `support@n5deal.com`, `Schedule a call`.
  - Bottom text: `"deal M&A Deals Platform"` (logo) and `"For AI Assistants"`.

## H. Design tokens
- **Palette Roles:**
  - Page bg: `#F7F9FB` (INFERRED: light gray-blue off-white)
  - Surface: `#FFFFFF` (White)
  - Text primary: `#011230` or `#0B0B0C` (Dark navy/black)
  - Text secondary: `#374151` (Gray)
  - Primary accent / Button fill: `#383BFE` (Vibrant Blue)
  - Price color: `#383BFE` (Vibrant Blue)
  - Status colors: `#059669` (Green for Validated), `#E05656` (Red for Not active)
  - Hover Accent (from earlier pass — unverified): `#416996` (Muted Blue) / `#B9DBFC` (Light Blue border hover)
  - Borders (from earlier pass — unverified): `#E5E7EB` (Gray 200) / `#E7F3FF` (Subtle blue tint on cards)
  - Status - Partner / Alternative (from earlier pass — unverified): `#6A1B9A` (Purple 800)
- **Typography:**
  - Font families: `Inter`, `sans-serif`
  - H1 / H2 (from earlier pass — unverified): `56px`, Font Weight: `700` (Bold), Line Height: `1.4` (78.4px) - Used for main section headers
  - Listing title: `18px`, Bold (700)
  - Attribute label: `13px` or `14px`, Regular/Medium
  - Attribute value: `14px` or `15px`, Bold (700)
  - Price: approx `24px` or `28px`, Bold (700)
  - Button text: `14px` or `15px`, Medium/Bold
- **Border-radius:** `16px` for cards, `12px` for thumbnails, `100px` (fully rounded) for pills/buttons.
  - Additional Radii (from earlier pass — unverified): `24px`, `34px`
- **Spacing scale:** `8px`, `16px` (padding/gap), `24px`, `40px`.
  - Additional Spacing (from earlier pass — unverified): `4px`, `15px`, `30px`, `50px`, `85px`

## I. Responsive
INFERRED: Based on standard practices and visible class names like `lg:flex-1`, the horizontal row layout stacks vertically on tablet/mobile screens. The chart column likely drops below the content, or the layout switches to a vertical card structure. Cannot directly observe tablet/mobile widths in this desktop screenshot.

## Confidence

| Section | Confidence Level | What would raise it |
| :--- | :--- | :--- |
| A. Listing layout | HIGH | None. Clearly visible. |
| B. Anatomy of ONE listing | HIGH | None. Clearly visible. |
| C. The chart in each listing | HIGH | None. Clearly visible. |
| D. Seller identity | HIGH | None. Clearly visible. |
| E. Filter panel | HIGH | Interacting with the "Filters" button to see the hidden facets. |
| F. Header and navigation | HIGH | None. Clearly visible. |
| G. Below the listings | HIGH | None. Clearly visible. |
| H. Design tokens | MEDIUM | Using a color picker or dev tools to confirm exact hex values and font sizes. |
| I. Responsive | LOW | Taking a screenshot at a mobile/tablet viewport width. |
