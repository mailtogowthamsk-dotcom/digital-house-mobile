import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import {
  buildRazorpayCheckoutHtml,
  clearRazorpayWebCheckoutRequest,
  subscribeRazorpayWebCheckout,
  type RazorpayWebCheckoutRequest
} from "../../services/razorpayWebCheckout";
import { RazorpayCheckoutCancelledError } from "../../services/razorpayTypes";

export function RazorpayWebCheckoutHost() {
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<RazorpayWebCheckoutRequest | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    return subscribeRazorpayWebCheckout((next) => {
      settledRef.current = false;
      setRequest(next);
    });
  }, []);

  const html = useMemo(
    () => (request ? buildRazorpayCheckoutHtml(request.options) : ""),
    [request]
  );

  const settle = (fn: () => void) => {
    if (settledRef.current || !request) return;
    settledRef.current = true;
    clearRazorpayWebCheckoutRequest();
    setRequest(null);
    fn();
  };

  const finishWithCancel = () => {
    settle(() => request!.reject(new RazorpayCheckoutCancelledError()));
  };

  const onMessage = (event: WebViewMessageEvent) => {
    if (!request || settledRef.current) return;
    let payload: {
      type?: string;
      message?: string;
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    };
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (payload.type === "success") {
      if (
        !payload.razorpay_payment_id ||
        !payload.razorpay_order_id ||
        !payload.razorpay_signature
      ) {
        settle(() => request.reject(new Error("Incomplete payment response from Razorpay.")));
        return;
      }
      settle(() =>
        request.resolve({
          razorpay_payment_id: payload.razorpay_payment_id!,
          razorpay_order_id: payload.razorpay_order_id!,
          razorpay_signature: payload.razorpay_signature!
        })
      );
      return;
    }

    if (payload.type === "dismiss") {
      settle(() => request.reject(new RazorpayCheckoutCancelledError()));
      return;
    }

    if (payload.type === "error") {
      settle(() => request.reject(new Error(payload.message || "Payment failed")));
    }
  };

  return (
    <Modal
      visible={Boolean(request)}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={finishWithCancel}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.title}>Complete payment</Text>
        <Pressable onPress={finishWithCancel} hitSlop={12} accessibilityRole="button">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      {request ? (
        <WebView
          originWhitelist={["*"]}
          source={{ html, baseUrl: "https://api.razorpay.com" }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          setSupportMultipleWindows={false}
          style={styles.web}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff"
  },
  title: { fontSize: 16, fontWeight: "700", color: "#0B1220" },
  close: { fontSize: 15, fontWeight: "600", color: "#2563EB" },
  web: { flex: 1, backgroundColor: "#0B1220" }
});
