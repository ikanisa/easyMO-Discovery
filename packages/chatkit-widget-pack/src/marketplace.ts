import type { Widgets } from "./types";
import { Actions } from "./actions";
import { action, card, title, text, caption, spacer, divider, row, button, form, input, markdown } from "./primitives";

export type Listing = {
  id: string;
  title: string;
  price?: string;
  location?: string;
  summary?: string;
  contactHint?: string;
};

export const MarketplaceSearchCard = (): Widgets.Card =>
  card([
    title("Marketplace", { size: "md" }),
    text("Search products & services near you."),
    spacer(12),
    form(
      [
        input("query", "What are you looking for? (e.g. iPhone 12, plumber, rice…)", { required: true }),
        spacer(8),
        input("near", "Near (optional) e.g. Kimironko", { required: false }),
        spacer(12),
        button("Search", undefined, { submit: true, color: "primary", style: "primary", block: true }),
      ],
      action(Actions.MARKET_SEARCH_SUBMIT),
      { direction: "col", gap: 8 }
    ),
    spacer(8),
    caption("Results come back as cards — you contact sellers directly."),
  ]);

export const ListingsCard = (listings: Listing[]): Widgets.Card => {
  const body =
    listings.length === 0
      ? [markdown("**No results yet.** Try a simpler keyword or different area.")]
      : listings.flatMap((l) => [
          card(
            [
              title(l.title, { size: "sm" }),
              ...(l.price ? [text(l.price, { size: "md" })] : []),
              ...(l.location ? [caption(l.location, { size: "sm" })] : []),
              ...(l.summary ? [caption(l.summary, { size: "sm" })] : []),
              spacer(8),
              row(
                [
                  button("Open", action(Actions.LISTING_OPEN, { listing_id: l.id }), { style: "primary", color: "primary" }),
                  button("Contact seller", action(Actions.LISTING_CONTACT, { listing_id: l.id }), { style: "secondary", color: "secondary" }),
                ],
                { gap: 8, wrap: "wrap" }
              ),
            ],
            { padding: 10, border: 1 }
          ),
          spacer(8),
        ]);

  return card([
    title("Results", { size: "md" }),
    spacer(8),
    divider(),
    spacer(12),
    ...body,
  ]);
};

