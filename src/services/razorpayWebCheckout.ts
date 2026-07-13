import {
  RazorpayUnavailableError,
  type RazorpayCheckoutOptions,
  type RazorpayCheckoutResult
} from "./razorpayTypes";

export type RazorpayWebCheckoutRequest = {
  options: RazorpayCheckoutOptions;
  resolve: (result: RazorpayCheckoutResult) => void;
  reject: (error: Error) => void;
};

type Listener = (request: RazorpayWebCheckoutRequest | null) => void;

let listener: Listener | null = null;
let pending: RazorpayWebCheckoutRequest | null = null;

export function subscribeRazorpayWebCheckout(cb: Listener): () => void {
  listener = cb;
  if (pending) cb(pending);
  return () => {
    if (listener === cb) listener = null;
  };
}

/** Opens Checkout.js inside the mounted WebView host (works in Expo Go). */
export function openRazorpayWebCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutResult> {
  return new Promise((resolve, reject) => {
    if (!listener) {
      reject(
        new RazorpayUnavailableError(
          "Payment UI is not ready. Restart the app and try again."
        )
      );
      return;
    }
    pending = {
      options,
      resolve: (result) => {
        pending = null;
        resolve(result);
      },
      reject: (error) => {
        pending = null;
        reject(error);
      }
    };
    listener(pending);
  });
}

export function clearRazorpayWebCheckoutRequest(): void {
  pending = null;
  listener?.(null);
}

export function buildRazorpayCheckoutHtml(options: RazorpayCheckoutOptions): string {
  const payload = {
    key: options.keyId,
    amount: options.amountPaise,
    currency: "INR",
    name: options.name || "Digital House",
    description: options.description,
    order_id: options.razorpayOrderId,
    prefill: options.prefill ?? {},
    theme: { color: "#0B1220" }
  };
  const optionsJson = JSON.stringify(payload).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Digital House Payment</title>
  <style>
    html, body { margin: 0; padding: 0; background: #0B1220; color: #fff; font-family: -apple-system, sans-serif; }
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    .msg { opacity: 0.85; font-size: 14px; line-height: 1.4; }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="wrap"><p class="msg">Opening secure payment…</p></div>
  <script>
    (function () {
      var options = ${optionsJson};
      function post(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }
      options.handler = function (response) {
        post({
          type: "success",
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        });
      };
      options.modal = {
        ondismiss: function () {
          post({ type: "dismiss" });
        }
      };
      try {
        var rzp = new Razorpay(options);
        rzp.on("payment.failed", function (resp) {
          var err = (resp && resp.error) || {};
          post({
            type: "error",
            message: err.description || err.reason || "Payment failed"
          });
        });
        rzp.open();
      } catch (e) {
        post({ type: "error", message: (e && e.message) || "Could not open checkout" });
      }
    })();
  </script>
</body>
</html>`;
}
