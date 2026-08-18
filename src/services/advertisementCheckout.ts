import {
  createAdvertisementPayment,
  getAdvertisementCatalog,
  verifyAdvertisementPayment
} from "../api/advertisement.api";
import { openRazorpayCheckout } from "./razorpayCheckout";
import { RazorpayCheckoutCancelledError } from "./razorpayTypes";

export async function checkoutAdvertisement(
  advertisementId: number,
  pricingId: number,
  prefill?: { email?: string; contact?: string; name?: string }
) {
  const catalog = await getAdvertisementCatalog();
  if (!catalog.payments.razorpayEnabled || !catalog.payments.keyId) {
    throw new Error("Payments are not configured. Contact support.");
  }
  const { order } = await createAdvertisementPayment(advertisementId, pricingId);
  try {
    const payment = await openRazorpayCheckout({
      keyId: order.keyId || catalog.payments.keyId,
      razorpayOrderId: order.razorpayOrderId,
      amountPaise: order.amountPaise,
      description: order.description,
      prefill
    });
    return verifyAdvertisementPayment({
      razorpayOrderId: payment.razorpay_order_id,
      razorpayPaymentId: payment.razorpay_payment_id,
      razorpaySignature: payment.razorpay_signature
    });
  } catch (e) {
    if (e instanceof RazorpayCheckoutCancelledError) throw e;
    throw e;
  }
}
