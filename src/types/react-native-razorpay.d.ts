declare module "react-native-razorpay" {
  export type RazorpaySuccessResponse = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };

  export type RazorpayErrorResponse = {
    code?: number | string;
    description?: string;
    error?: { code?: string; description?: string; reason?: string };
  };

  export type RazorpayOptions = {
    key: string;
    amount: number | string;
    currency: string;
    name?: string;
    description?: string;
    order_id: string;
    prefill?: { email?: string; contact?: string; name?: string };
    theme?: { color?: string };
  };

  const RazorpayCheckout: {
    open: (
      options: RazorpayOptions,
      successCallback?: (data: RazorpaySuccessResponse) => void,
      errorCallback?: (error: RazorpayErrorResponse) => void
    ) => Promise<RazorpaySuccessResponse>;
  };

  export default RazorpayCheckout;
}
