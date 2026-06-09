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
  constructor(
    message = "In-app Razorpay checkout is not available in this build. Use dev payments or add react-native-razorpay for native checkout."
  ) {
    super(message);
    this.name = "RazorpayUnavailableError";
  }
}

/** Native Razorpay SDK removed — matrimony checkout falls back when devPaymentsAllowed. */
export async function openRazorpayCheckout(
  _options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutResult> {
  throw new RazorpayUnavailableError();
}
