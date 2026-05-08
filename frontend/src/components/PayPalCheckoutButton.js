// PayPalCheckoutButton — reusable PayPal Smart Button for the catalog.
// Loads the PayPal SDK on first mount, then renders the official Buttons.
// Server is the single source of truth for price (via product_id).
import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { apiJSON } from "../lib/api";

let _ppConfigPromise = null;
function loadPayPalConfig() {
  if (!_ppConfigPromise) {
    _ppConfigPromise = apiJSON("/paypal/config").catch(() => ({
      enabled: false,
      client_id: null,
    }));
  }
  return _ppConfigPromise;
}

export default function PayPalCheckoutButton({
  productId,
  extras = {},          // e.g. { sponsor_inquiry_id, sponsor_email, sponsor_name }
  getExtras,            // async preflight for extras that must be created at click time
  onApproved,           // (result) => void
  onError,              // (msg) => void
  disabled = false,
  testIdSuffix = "",
}) {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    let mounted = true;
    loadPayPalConfig().then((c) => mounted && setCfg(c));
    return () => { mounted = false; };
  }, []);

  if (!cfg) {
    return (
      <div
        data-testid={`paypal-loading${testIdSuffix ? `-${testIdSuffix}` : ""}`}
        className="w-full py-3.5 rounded-2xl text-center text-xs"
        style={{
          background: "hsla(220,30%,18%,0.4)",
          color: "hsl(220,15%,60%)",
          border: "1px dashed hsl(220,30%,28%)",
        }}
      >
        Loading PayPal…
      </div>
    );
  }

  if (!cfg.enabled || !cfg.client_id) {
    return (
      <div
        data-testid={`paypal-unavailable${testIdSuffix ? `-${testIdSuffix}` : ""}`}
        className="w-full py-3.5 rounded-2xl text-center text-xs"
        style={{
          background: "hsla(220,30%,18%,0.4)",
          color: "hsl(220,15%,60%)",
          border: "1px dashed hsl(220,30%,28%)",
        }}
      >
        PayPal checkout is unavailable right now.
      </div>
    );
  }

  return (
    <div data-testid={`paypal-button${testIdSuffix ? `-${testIdSuffix}` : ""}`}>
      <PayPalScriptProvider
        options={{
          clientId: cfg.client_id,
          currency: cfg.currency || "USD",
          intent: "capture",
          // Sandbox buyer flow + standard funding sources
          components: "buttons",
        }}
      >
        <PayPalButtons
          disabled={disabled}
          style={{ layout: "vertical", color: "blue", shape: "pill", label: "paypal", height: 48 }}
          createOrder={async () => {
            try {
              const dynamicExtras = getExtras ? await getExtras() : {};
              const res = await apiJSON("/paypal/create-order", {
                method: "POST",
                body: JSON.stringify({ product_id: productId, ...extras, ...(dynamicExtras || {}) }),
              });
              if (!res?.order_id) throw new Error("No order_id returned");
              return res.order_id;
            } catch (e) {
              onError?.(e.message || "Could not start PayPal checkout.");
              throw e;
            }
          }}
          onApprove={async (data) => {
            try {
              const res = await apiJSON("/paypal/capture-order", {
                method: "POST",
                body: JSON.stringify({ order_id: data.orderID }),
              });
              if (res?.ok) {
                onApproved?.(res);
              } else {
                onError?.(res?.status || "Payment did not complete.");
              }
            } catch (e) {
              onError?.(e.message || "Capture failed.");
            }
          }}
          onError={(e) => {
            onError?.((e && e.message) || "PayPal hit an error. Try again.");
          }}
          onCancel={() => {
            onError?.("Payment was cancelled. Your spot is still safe.");
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
