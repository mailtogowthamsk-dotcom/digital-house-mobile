import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Linking
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import {
  useNavigation,
  useRoute,
  type RouteProp
} from "@react-navigation/native";
import { useTheme, type ThemeColors } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { getLegalDocument, type LegalDocumentDto } from "../../api/legal.api";
import { getAuthErrorMessage } from "../../api/client";
import type { RootStackParamList } from "../../navigation/types";

function escapeCss(value: string): string {
  return value.replace(/[<>'"]/g, "");
}

function buildDocumentHtml(
  content: string,
  colors: ThemeColors,
  isDark: boolean
): string {
  const bg = escapeCss(colors.background);
  const text = escapeCss(colors.text);
  const muted = escapeCss(colors.textSecondary);
  const primary = escapeCss(colors.primary);
  const border = isDark ? "rgba(248,250,252,0.12)" : "rgba(15,23,42,0.08)";
  const codeBg = isDark ? "#1E293B" : "#F1F5F9";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: ${bg};
      color: ${text};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 17px;
      line-height: 1.7;
      -webkit-text-size-adjust: 100%;
    }
    body { padding: 20px 18px 48px; }
    h1 { font-size: 26px; line-height: 1.25; margin: 0 0 16px; font-weight: 700; }
    h2 { font-size: 21px; line-height: 1.3; margin: 28px 0 12px; font-weight: 700; }
    h3 { font-size: 18px; line-height: 1.35; margin: 22px 0 10px; font-weight: 650; }
    p, li { font-size: 17px; line-height: 1.7; }
    p { margin: 0 0 14px; }
    ul, ol { padding-left: 1.35em; margin: 0 0 14px; }
    li { margin-bottom: 8px; }
    a { color: ${primary}; text-decoration: underline; }
    strong { font-weight: 700; }
    hr { border: none; border-top: 1px solid ${border}; margin: 24px 0; }
    blockquote {
      margin: 16px 0;
      padding: 10px 14px;
      border-left: 3px solid ${primary};
      color: ${muted};
      background: ${codeBg};
    }
    code, pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      background: ${codeBg};
      border-radius: 6px;
    }
    code { padding: 2px 6px; }
    pre { padding: 12px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 15px; }
    th, td { border: 1px solid ${border}; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: ${codeBg}; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

async function openExternalUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return;
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
    await Linking.openURL(trimmed);
    return;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      await WebBrowser.openBrowserAsync(trimmed, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN
      });
    } catch {
      await Linking.openURL(trimmed);
    }
  }
}

export function LegalDocumentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "LegalDocument">>();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const documentKey = route.params?.documentKey?.trim() || "";
  const slug = route.params?.slug?.trim() || "";
  const lookup = documentKey || slug;

  const [doc, setDoc] = useState<LegalDocumentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    route.params?.title?.trim() ||
    doc?.title ||
    "Legal document";

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!lookup) {
        setError("Missing document key.");
        setLoading(false);
        return;
      }
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const result = await getLegalDocument(lookup);
        setDoc(result.document);
      } catch (e) {
        setDoc(null);
        setError(getAuthErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [lookup]
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const html = useMemo(() => {
    if (!doc?.content) return "";
    return buildDocumentHtml(doc.content, colors, isDark);
  }, [doc?.content, colors, isDark]);

  const onShouldStartLoadWithRequest = useCallback((req: WebViewNavigation) => {
    const url = req.url || "";
    if (
      url === "about:blank" ||
      url.startsWith("data:") ||
      url.startsWith("blob:") ||
      url.startsWith("file:")
    ) {
      return true;
    }
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("mailto:") ||
      url.startsWith("tel:")
    ) {
      void openExternalUrl(url);
      return false;
    }
    return true;
  }, []);

  if (!lookup) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          No document specified.
        </Text>
      </View>
    );
  }

  if (loading && !doc) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>Loading document…</Text>
      </View>
    );
  }

  if (error && !doc) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.centered}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load({ soft: true });
            }}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => void load()}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {doc?.version ? (
        <View style={[styles.metaBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            Version {doc.version}
            {doc.publishedAt
              ? ` · Updated ${new Date(doc.publishedAt).toLocaleDateString()}`
              : ""}
          </Text>
        </View>
      ) : null}
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://digitalhouse.app" }}
        style={[styles.flex, { backgroundColor: colors.background }]}
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.webviewLoading, { backgroundColor: colors.background }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        setSupportMultipleWindows={false}
        pullToRefreshEnabled
        onLoadEnd={() => {
          if (refreshing) setRefreshing(false);
        }}
      />
      <Pressable
        style={[styles.refreshBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => {
          setRefreshing(true);
          void load({ soft: true });
        }}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>
            Pull or tap to refresh latest version
          </Text>
        )}
      </Pressable>
      {error ? (
        <Pressable
          style={[styles.banner, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => void load({ soft: true })}
        >
          <Text style={{ color: colors.error, fontSize: 13 }}>{error} · Tap to retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md
  },
  hint: { fontSize: 14, marginTop: spacing.sm },
  errorText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  metaBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  metaText: { fontSize: 12, fontWeight: "600" },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  refreshBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40
  },
  banner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  }
});
