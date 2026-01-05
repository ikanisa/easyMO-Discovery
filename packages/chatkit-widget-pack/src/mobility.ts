import type { Widgets } from "./types";
import { Actions } from "./actions";
import { action, card, title, text, caption, spacer, divider, row, col, button, form, input, markdown } from "./primitives";

export type MatchCandidate = {
  id: string;
  label: string;      // e.g. "Driver Jean, Moto"
  etaMin?: number;    // e.g. 6
  distanceKm?: number;// e.g. 2.1
  note?: string;      // e.g. "Near Kigali Heights"
  contactHint?: string; // e.g. "+2507xxxx"
  mapsUrl?: string;
};

export const ModePickerCard = (): Widgets.Card =>
  card(
    [
      title("easyMO", { size: "lg" }),
      text("Choose what you want to do right now."),
      spacer(8),
      row(
        [
          button("Passenger", action(Actions.MODE_SELECT, { mode: "passenger" }), { color: "primary", style: "primary" }),
          button("Driver", action(Actions.MODE_SELECT, { mode: "driver" }), { color: "secondary", style: "secondary" }),
          button("Marketplace", action(Actions.MODE_SELECT, { mode: "marketplace" }), { color: "info", style: "secondary" }),
        ],
        { gap: 8, wrap: "wrap" }
      ),
      spacer(8),
      caption("Tip: this is an agent-first flow — the agent brokers, you connect directly."),
    ],
    { padding: 12, border: 1, radius: "lg" as any }
  );

export const PassengerRideRequestCard = (): Widgets.Card =>
  card([
    title("Request a ride", { size: "md" }),
    text("Give pickup + dropoff. You can also use GPS."),
    spacer(8),

    row(
      [
        button("Use my GPS", action(Actions.LOCATION_REQUEST_GPS, { for: "pickup" }), { color: "discovery", style: "secondary" }),
        button("Enter manually", action(Actions.LOCATION_SET_MANUAL, { for: "pickup" }), { color: "secondary", style: "secondary" }),
      ],
      { gap: 8, wrap: "wrap" }
    ),

    spacer(12),
    divider(),
    spacer(12),

    form(
      [
        input("pickup_text", "Pickup (e.g. Kigali Heights)", { required: true }),
        spacer(8),
        input("dropoff_text", "Dropoff (e.g. Remera)", { required: true }),
        spacer(8),
        input("note", "Optional note (bags, gate, landmark…)", { required: false }),
        spacer(12),
        button("Find matches", undefined, { submit: true, color: "primary", style: "primary", block: true }),
      ],
      action(Actions.RIDE_REQUEST_SUBMIT),
      { direction: "col", gap: 8 }
    ),

    spacer(8),
    caption("We'll return a ranked list of nearby drivers. You contact them directly."),
  ]);

export const DriverAvailabilityCard = (): Widgets.Card =>
  card([
    title("Driver status", { size: "md" }),
    text("Set yourself available and share your location."),
    spacer(8),

    row(
      [
        button("I'm available now", action(Actions.DRIVER_AVAILABILITY_SET, { available: true }), {
          color: "success",
          style: "primary",
        }),
        button("Not available", action(Actions.DRIVER_AVAILABILITY_SET, { available: false }), {
          color: "danger",
          style: "secondary",
        }),
      ],
      { gap: 8, wrap: "wrap" }
    ),

    spacer(8),
    caption("When available, the agent can match you to nearby passenger requests."),
    spacer(12),

    button("Update my GPS location", action(Actions.LOCATION_REQUEST_GPS, { for: "driver" }), {
      color: "discovery",
      style: "secondary",
      block: true,
    }),

    spacer(8),
    caption("You stay in control — this is brokering, not a heavy ride app."),
  ]);

export const MatchesCard = (candidates: MatchCandidate[]): Widgets.Card => {
  const items: Widgets.WidgetComponent[] =
    candidates.length === 0
      ? [markdown("**No matches yet.** Try refreshing or widening your area.")]
      : candidates.flatMap((c) => {
          const metaParts = [
            typeof c.etaMin === "number" ? `${c.etaMin} min` : null,
            typeof c.distanceKm === "number" ? `${c.distanceKm.toFixed(1)} km` : null,
          ].filter(Boolean);

          return [
            card(
              [
                row(
                  [
                    col([text(c.label, { size: "md" })], { flex: 1 }),
                    ...(metaParts.length
                      ? [caption(metaParts.join(" • "), { size: "sm" })]
                      : []),
                  ],
                  { justify: "space-between", align: "center", gap: 8 }
                ),
                ...(c.note ? [caption(c.note, { size: "sm" })] : []),
                spacer(8),
                row(
                  [
                    button("Select", action(Actions.MATCH_SELECT, { match_id: c.id }), {
                      color: "primary",
                      style: "primary",
                    }),
                    ...(c.mapsUrl
                      ? [
                          button("Open in Maps", action(Actions.OPEN_EXTERNAL, { url: c.mapsUrl }), {
                            color: "secondary",
                            style: "secondary",
                          }),
                        ]
                      : []),
                  ],
                  { gap: 8, wrap: "wrap" }
                ),
              ],
              { padding: 10, border: 1 }
            ),
            spacer(8),
          ];
        });

  return card([
    title("Best matches nearby", { size: "md" }),
    text("Pick one. The agent is brokering — you connect directly."),
    spacer(8),
    button("Refresh matches", action(Actions.MATCHES_REFRESH), { color: "secondary", style: "secondary" }),
    spacer(12),
    ...items,
    caption("Safety: verify identity, agree price, and meet in a public spot when possible."),
  ]);
};

export const HandoffCard = (summary: { who: string; nextStep: string }): Widgets.Card =>
  card([
    title("Handoff", { size: "md" }),
    markdown(`**${summary.who}**\n\n${summary.nextStep}`),
    spacer(12),
    button("Done", action(Actions.HANDOFF_DONE), { color: "success", style: "primary", block: true }),
    spacer(8),
    caption("This is intentionally lightweight: brokering + direct connection."),
  ]);

