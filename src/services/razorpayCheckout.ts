export type RazorpayCheckoutResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  description: string;
  name?: string;
  prefill?: { email?: string; contact?: string; name?: string };
};

export class RazorpayUnavailableError extends Error {
  constructor(message = "Razorpay native checkout is not available. Use a dev build (not Expo Go).") {
    super(message);
    this.name = "RazorpayUnavailableError";
  }
}

/** Opens Razorpay native checkout. Requires dev build with react-native-razorpay linked. */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutResult> {
  let RazorpayCheckout: { open: (opts: Record<string, unknown>) => Promise<RazorpayCheckoutResult> };
  try {
    RazorpayCheckout = require("react-native-razorpay").default;
  } catch {
    throw new RazorpayUnavailableError();
  }
  if (!RazorpayCheckout?.open) {
    throw new RazorpayUnavailableError();
  }

  return RazorpayCheckout.open({
    key: options.keyId,
    order_id: options.razorpayOrderId,
    amount: options.amountPaise,
    currency: "INR",
    name: options.name ?? "Digital House",
    description: options.description,
    prefill: options.prefill,
    theme: { color: "#1D4ED8" }
  });
}
