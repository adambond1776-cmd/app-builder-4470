// Stripe checkout helper — single entry point for all 4 surfaces.
// Product catalog lives server-side; frontend only sends product_id + origin.
//
// Feature-flag aware: if backend reports ENABLE_STRIPE_CHECKOUT=False, the
// client-side helper either routes to the PayPal pricing flow or short-circuits
// with a friendly notice instead of opening Stripe.
import { apiJSON } from "./api";

let _flagsCache = null;
let _flagsPromise = null;

async function getPaymentFlags() {
  if (_flagsCache) return _flagsCache;
  if (!_flagsPromise) {
    _flagsPromise = apiJSON("/public-config")
      .then((data) => {
        _flagsCache = data || {};
        return _flagsCache;
      })
      .catch(() => {
        // If config fetch fails, default to "everything off" — safer than firing live checkouts.
        _flagsCache = { enable_stripe_checkout: false, enable_paypal_checkout: false };
        return _flagsCache;
      });
  }
  return _flagsPromise;
}

export async function isStripeEnabled() {
  const f = await getPaymentFlags();
  return !!f.enable_stripe_checkout;
}

export async function isPaypalEnabled() {
  const f = await getPaymentFlags();
  return !!f.enable_paypal_checkout;
}

/**
 * Initiate Stripe checkout and redirect the browser to Stripe's hosted page.
 * If Stripe is disabled via feature flag, throws a user-friendly error.
 * @param {string} product_id - One of the keys in server's STRIPE_PRODUCTS
 * @param {object} [extras] - Optional: sponsor_inquiry_id, sponsor_email, sponsor_name
 */
export async function startCheckout(product_id, extras = {}) {
  const flags = await getPaymentFlags();
  if (!flags.enable_stripe_checkout) {
    if (flags.enable_paypal_checkout) {
      const redirect = new URL("/pricing", window.location.origin);
      redirect.searchParams.set("product", product_id);
      window.location.href = redirect.toString();
      return;
    }
    throw new Error(
      "Payments are temporarily paused while we move to PayPal. Check back in a day or two — your spot is safe."
    );
  }
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
