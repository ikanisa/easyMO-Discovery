import type { Widgets } from "./types";
import { Actions } from "./actions";
import { action, card, title, text, caption, spacer, divider, row, button, form, input, markdown, listView, listItem } from "./primitives";

export type BroadcastTarget = {
  business_id: string;
  name: string;
  category?: string;
  distance_km?: number;
  whatsapp_hint?: string; // masked
  status?: "pending" | "sent" | "delivered" | "read" | "replied" | "failed";
};

export type BroadcastStats = {
  campaign_id: string;
  total: number;
  sent: number;
  delivered: number;
  replied: number;
  failed: number;
};

export function BroadcastComposerCard(): Widgets.Card {
  return card([
    title("Broadcast nearby businesses", { size: "md" }),
    text("The agent will message selected nearby businesses on WhatsApp, then stream replies here."),
    spacer(12),

    // Form values get merged into action.payload using input names
    form(
      [
        input("need", "What do you need? (e.g. \"2kg rice\", \"airport ride\", \"paracetamol\")", { required: true }),
        spacer(8),
        input("category", "Category (e.g. pharmacy, restaurant, hardware…)", { required: false }),
        spacer(8),
        input("radius_km", "Radius in km (e.g. 3)", { required: true, inputType: "number" as any }),
        spacer(8),
        input("max_targets", "Max businesses to contact (e.g. 15)", { required: true, inputType: "number" as any }),
        spacer(12),
        button("Preview targets", undefined, { submit: true, color: "secondary", style: "secondary", block: true }),
      ],
      action(Actions.BROADCAST_PREVIEW)
    ),

    spacer(8),
    caption("Tip: keep broadcasts short. Businesses reply faster to clear yes/no questions."),
  ]);
}

export function BroadcastTargetsPreviewCard(targets: BroadcastTarget[], previewPayload: Record<string, any>): Widgets.Card {
  return card([
    title("Targets preview", { size: "md" }),
    caption("Confirm to start WhatsApp broadcast."),
    spacer(8),
    listView(
      targets.map(t =>
        listItem(
          [
            text(t.name, { weight: "semibold" as any }),
            caption(
              [
                t.category ? t.category : null,
                typeof t.distance_km === "number" ? `${t.distance_km.toFixed(1)} km` : null,
                t.status ? `• ${t.status}` : null,
              ].filter(Boolean).join(" ")
            ),
          ],
          {
            // Optional: click a target to exclude/include
            onClickAction: action(Actions.BROADCAST_TOGGLE_TARGET, { business_id: t.business_id }),
          }
        )
      ),
      {
        status: { text: `${targets.length} selected` } as any,
        limit: "auto" as any,
      }
    ),

    spacer(12),
    row([
      // Long running: make the container inert while broadcast starts
      button(
        "Start broadcast",
        action(Actions.BROADCAST_START, previewPayload),
        { color: "primary", style: "primary", loadingBehavior: "container" as any }
      ),
      button("Cancel", action(Actions.BROADCAST_CANCEL, { campaign_id: previewPayload.campaign_id }), { color: "danger", style: "secondary" }),
    ], { gap: 8, wrap: "wrap" }),
  ], { padding: 12 });
}

export function BroadcastProgressCard(stats: BroadcastStats, targets: BroadcastTarget[]): Widgets.Card {
  return card([
    title("Broadcast progress", { size: "md" }),
    markdown(`**${stats.replied} replied** • ${stats.delivered} delivered • ${stats.failed} failed • ${stats.total} total`),
    spacer(8),

    button("View responses", action(Actions.BROADCAST_VIEW_RESPONSES, { campaign_id: stats.campaign_id }), {
      color: "info",
      style: "secondary",
      iconStart: "chat" as any,
    }),

    spacer(8),
    divider(),
    spacer(12),

    listView(
      targets.map(t =>
        listItem(
          [
            text(t.name),
            caption(`${t.status ?? "pending"}${typeof t.distance_km === "number" ? ` • ${t.distance_km.toFixed(1)} km` : ""}`),
          ],
          {
            onClickAction: action(Actions.BROADCAST_BUSINESS_OPEN, { business_id: t.business_id, campaign_id: stats.campaign_id }),
          }
        )
      ),
      { limit: "auto" as any }
    ),

    spacer(12),
    row([
      button("Resend failed", action(Actions.BROADCAST_RESEND_FAILED, { campaign_id: stats.campaign_id }), { color: "warning", style: "secondary" }),
      button("Stop", action(Actions.BROADCAST_CANCEL, { campaign_id: stats.campaign_id }), { color: "danger", style: "secondary" }),
    ], { gap: 8, wrap: "wrap" }),
  ]);
}

export function IncomingResponsesCard(campaign_id: string, responses: Array<{business_name: string; text: string; ts: string; business_id: string;}>): Widgets.Card {
  return card([
    title("Business responses", { size: "md" }),
    caption("Replies below are from WhatsApp. Tap one to open details."),
    spacer(8),

    listView(
      responses.map(r =>
        listItem(
          [
            text(r.business_name, { weight: "semibold" as any }),
            caption(r.text.length > 120 ? r.text.slice(0, 120) + "…" : r.text),
          ],
          { onClickAction: action(Actions.BROADCAST_RESPONSE_OPEN, { campaign_id, business_id: r.business_id, ts: r.ts }) }
        )
      ),
      { limit: "auto" as any }
    ),
  ]);
}

