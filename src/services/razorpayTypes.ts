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
    message = "In-app Razorpay checkout is not available in this build. Use a development/EAS build, or enable WebView checkout."
  ) {
    super(message);
    this.name = "RazorpayUnavailableError";
  }
}

export class RazorpayCheckoutCancelledError extends Error {
  constructor(message = "Payment cancelled.") {
    super(message);
    this.name = "RazorpayCheckoutCancelledError";
  }
}
