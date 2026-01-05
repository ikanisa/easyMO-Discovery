import type { Widgets } from "./types";
import { Actions } from "./actions";
import { action, card, title, text, caption, spacer, divider, row, button, form, input, markdown, createForm } from "./primitives";

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

/**
 * Enhanced Business Onboarding Form with validation
 */
export const BusinessOnboardingForm = (): Widgets.Card => {
  return createForm(
    [
      {
        name: "business_name",
        label: "Business Name",
        type: "text",
        placeholder: "Enter your business name",
        required: true,
        validation: {
          required: true,
          minLength: 2,
          message: "Business name must be at least 2 characters",
        },
      },
      {
        name: "phone",
        label: "Phone Number",
        type: "tel",
        placeholder: "+250XXXXXXXXX",
        required: true,
        validation: {
          required: true,
          pattern: "^\\+250\\d{9}$",
          message: "Phone must be in format +250XXXXXXXXX",
        },
      },
      {
        name: "category",
        label: "Category",
        type: "select",
        required: true,
        options: [
          { label: "Restaurant", value: "restaurant" },
          { label: "Retail", value: "retail" },
          { label: "Services", value: "services" },
          { label: "Pharmacy", value: "pharmacy" },
          { label: "Other", value: "other" },
        ],
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Describe your business...",
        validation: {
          maxLength: 500,
          message: "Description must be less than 500 characters",
        },
        rows: 4,
      },
    ],
    action(Actions.BUSINESS_ONBOARD_SUBMIT),
    "Register Your Business"
  );
};

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

