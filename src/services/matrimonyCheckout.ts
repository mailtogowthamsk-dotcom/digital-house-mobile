import {
  confirmMatrimonyContactPayment,
  createMatrimonyPaymentOrder,
  getMatrimonyPaymentsConfig,
  subscribeMatrimonyPlan,
  verifyMatrimonyPayment,
  startMatrimonyContactPayment,
  type MatrimonyPaymentPurpose,
  type MatrimonySubscriptionSummary
} from "../api/matrimony.api";
import { openRazorpayCheckout, RazorpayUnavailableError } from "./razorpayCheckout";

export type CheckoutPrefill = { email?: string; contact?: string; name?: string };

export type SubscriptionCheckoutResult = {
  subscription: MatrimonySubscriptionSummary;
  message?: string;
};

export type ContactCheckoutResult = {
  mobile: string | null;
  message?: string;
};

export async function checkoutMatrimonySubscription(
  plan: "GOLD" | "PLATINUM",
  prefill?: CheckoutPrefill
): Promise<SubscriptionCheckoutResult> {
  const purpose: MatrimonyPaymentPurpose =
    plan === "GOLD" ? "SUBSCRIPTION_GOLD" : "SUBSCRIPTION_PLATINUM";
  const config = await getMatrimonyPaymentsConfig();

  if (config.razorpayEnabled && config.keyId) {
    try {
      const { order } = await createMatrimonyPaymentOrder(purpose);
      const payment = await openRazorpayCheckout({
        keyId: config.keyId,
        razorpayOrderId: order.razorpayOrderId,
        amountPaise: order.amountPaise,
        description: order.description,
        prefill
      });
      const res = await verifyMatrimonyPayment({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature
      });
      if (!res.subscription) throw new Error("Subscription not activated");
      return { subscription: res.subscription, message: res.message };
    } catch (e) {
      if (e instanceof RazorpayUnavailableError && config.devPaymentsAllowed) {
        return devSubscribe(plan);
      }
      throw e;
    }
  }

  if (config.devPaymentsAllowed) {
    return devSubscribe(plan);
  }

  throw new Error("Payments are not configured. Contact support.");
}

export async function checkoutMatrimonyContactReveal(
  targetUserId: number,
  prefill?: CheckoutPrefill
): Promise<ContactCheckoutResult> {
  const config = await getMatrimonyPaymentsConfig();

  if (config.razorpayEnabled && config.keyId) {
    try {
      const { order } = await createMatrimonyPaymentOrder("CONTACT_REVEAL", targetUserId);
      const payment = await openRazorpayCheckout({
        keyId: config.keyId,
        razorpayOrderId: order.razorpayOrderId,
        amountPaise: order.amountPaise,
        description: order.description,
        prefill
      });
      const res = await verifyMatrimonyPayment({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature
      });
      return {
        mobile: res.contact?.mobile ?? null,
        message: res.message ?? "Contact revealed."
      };
    } catch (e) {
      if (e instanceof RazorpayUnavailableError && config.devPaymentsAllowed) {
        return devContactReveal(targetUserId);
      }
      throw e;
    }
  }

  if (config.devPaymentsAllowed) {
    return devContactReveal(targetUserId);
  }

  throw new Error("Payments are not configured. Contact support.");
}

async function devSubscribe(plan: "GOLD" | "PLATINUM"): Promise<SubscriptionCheckoutResult> {
  const res = await subscribeMatrimonyPlan(plan);
  return { subscription: res.subscription, message: res.message };
}

async function devContactReveal(targetUserId: number): Promise<ContactCheckoutResult> {
  await startMatrimonyContactPayment(targetUserId);
  const res = await confirmMatrimonyContactPayment(targetUserId);
  return { mobile: res.mobile, message: res.message };
}
