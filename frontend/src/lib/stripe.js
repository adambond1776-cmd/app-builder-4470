// Stripe checkout helper — single entry point for all 4 surfaces.
// Product catalog lives server-side; frontend only sends product_id + origin.
import { apiJSON } from "./api";

/**
 * Initiate Stripe checkout and redirect the browser to Stripe's hosted page.
 * @param {string} product_id - One of the keys in server's STRIPE_PRODUCTS
 * @param {object} [extras] - Optional: sponsor_inquiry_id, sponsor_email, sponsor_name
 */
export async function startCheckout(product_id, extras = {}) {
  const origin_url = window.location.origin;
  const res = await apiJSON("/stripe/checkout", {
    method: "POST",
    body: JSON.stringify({ product_id, origin_url, ...extras }),
  });
  if (!res?.url) throw new Error("No checkout URL returned");
  window.location.href = res.url;
}

/**
 * Poll the session status — called by PaymentReturn page.
 */
export async function getCheckoutStatus(session_id) {
  return apiJSON(`/stripe/status/${encodeURIComponent(session_id)}`);
}
