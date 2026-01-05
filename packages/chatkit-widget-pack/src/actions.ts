export const Actions = {
  // Global navigation / mode switching
  MODE_SELECT: "easymo.v1.mode.select",

  // Location capture
  LOCATION_REQUEST_GPS: "easymo.v1.location.request_gps",
  LOCATION_SET_MANUAL: "easymo.v1.location.set_manual",

  // Mobility
  RIDE_REQUEST_SUBMIT: "easymo.v1.ride.request_submit",
  DRIVER_AVAILABILITY_SET: "easymo.v1.driver.availability_set",
  MATCHES_REFRESH: "easymo.v1.matches.refresh",
  MATCH_SELECT: "easymo.v1.match.select",
  HANDOFF_DONE: "easymo.v1.handoff.done",

  // Marketplace
  MARKET_SEARCH_SUBMIT: "easymo.v1.market.search_submit",
  LISTING_OPEN: "easymo.v1.market.listing_open",
  LISTING_CONTACT: "easymo.v1.market.listing_contact",

  // WhatsApp broadcast
  BROADCAST_PREVIEW: "easymo.v1.broadcast.preview",
  BROADCAST_START: "easymo.v1.broadcast.start",
  BROADCAST_CANCEL: "easymo.v1.broadcast.cancel",
  BROADCAST_RESEND_FAILED: "easymo.v1.broadcast.resend_failed",
  BROADCAST_VIEW_RESPONSES: "easymo.v1.broadcast.view_responses",
  BROADCAST_TOGGLE_TARGET: "easymo.v1.broadcast.toggle_target",
  BROADCAST_BUSINESS_OPEN: "easymo.v1.business.open",

  // Fired by realtime/webhook via sendAction
  BROADCAST_INBOUND_RESPONSE: "easymo.v1.broadcast.inbound_response",
  BROADCAST_STATUS_UPDATE: "easymo.v1.broadcast.status_update",
  BROADCAST_RESPONSE_OPEN: "easymo.v1.broadcast.response.open",

  // Utility
  OPEN_EXTERNAL: "easymo.v1.open_external",
} as const;

export type ActionType = (typeof Actions)[keyof typeof Actions];

