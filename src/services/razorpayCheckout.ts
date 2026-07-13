import { NativeModules, TurboModuleRegistry } from "react-native";
import type {
  RazorpayErrorResponse,
  RazorpayOptions,
  RazorpaySuccessResponse
} from "react-native-razorpay";
import { openRazorpayWebCheckout } from "./razorpayWebCheckout";
import {
  RazorpayCheckoutCancelledError,
  RazorpayUnavailableError,
  type RazorpayCheckoutOptions,
  type RazorpayCheckoutResult
} from "./razorpayTypes";

export type { RazorpayCheckoutOptions, RazorpayCheckoutResult };
export { RazorpayCheckoutCancelledError, RazorpayUnavailableError };

function isNativeRazorpayAvailable(): boolean {
  try {
    if (NativeModules.RNRazorpayCheckout) return true;
    const turbo =
      typeof TurboModuleRegistry?.get === "function"
        ? TurboModuleRegistry.get("NativeRazorpayCheckout") ||
          TurboModuleRegistry.get("RNRazorpayCheckout")
        : null;
    return Boolean(turbo);
  } catch {
    return false;
  }
}

function isUserCancelled(error: RazorpayErrorResponse | Error | unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as RazorpayErrorResponse & { message?: string };
  const code = String(e.code ?? e.error?.code ?? "").toLowerCase();
  const description = String(
    e.description ?? e.error?.description ?? e.message ?? ""
  ).toLowerCase();
  return (
    code === "2" ||
    code.includes("cancel") ||
    description.includes("cancel") ||
    description.includes("dismiss")
  );
}

async function openNativeRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutResult> {
  // Native module only exists in custom/EAS builds — not Expo Go.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("react-native-razorpay");
  const RazorpayCheckout = mod?.default ?? mod;
  if (!RazorpayCheckout?.open) {
    throw new RazorpayUnavailableError();
  }

  const payload: RazorpayOptions = {
    key: options.keyId,
    amount: options.amountPaise,
    currency: "INR",
    name: options.name || "Digital House",
    description: options.description,
    order_id: options.razorpayOrderId,
    prefill: options.prefill,
    theme: { color: "#0B1220" }
  };

  try {
    const data = (await RazorpayCheckout.open(payload)) as RazorpaySuccessResponse;
    if (!data?.razorpay_payment_id || !data?.razorpay_order_id || !data?.razorpay_signature) {
      throw new Error("Incomplete payment response from Razorpay.");
    }
    return {
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_order_id: data.razorpay_order_id,
      razorpay_signature: data.razorpay_signature
    };
  } catch (error) {
    if (error instanceof RazorpayCheckoutCancelledError) throw error;
    if (isUserCancelled(error)) {
      throw new RazorpayCheckoutCancelledError();
    }
    const e = error as RazorpayErrorResponse & { message?: string };
    const message =
      e.description || e.error?.description || e.message || "Payment failed";
    throw new Error(message);
  }
}

/**
 * Opens Razorpay Standard Checkout.
 * Prefers the native SDK when linked; falls back to Checkout.js in a WebView.
 */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutResult> {
  if (!options.keyId || !options.razorpayOrderId) {
    throw new Error("Missing Razorpay order details.");
  }

  if (isNativeRazorpayAvailable()) {
    try {
      return await openNativeRazorpayCheckout(options);
    } catch (error) {
      if (
        error instanceof RazorpayCheckoutCancelledError ||
        !(error instanceof RazorpayUnavailableError)
      ) {
        throw error;
      }
      // Fall through to WebView if native module is present but unusable.
    }
  }

  try {
    return await openRazorpayWebCheckout(options);
  } catch (error) {
    if (error instanceof RazorpayCheckoutCancelledError) throw error;
    if (error instanceof Error) throw error;
    throw new RazorpayUnavailableError();
  }
}
