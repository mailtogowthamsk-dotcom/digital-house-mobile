import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getMasterItems, type MasterDataItem } from "../../api/options.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { textFieldCompact } from "../../theme/textField";

type SuggestItem = {
  id: string;
  label: string;
  type: string;
};

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  /** Called when user picks a suggestion (also updates the text). */
  onSelect?: (label: string, item: SuggestItem) => void;
  /** Called on keyboard submit with current text. */
  onSubmitEditing?: () => void;
  placeholder?: string;
  /** MDM types to suggest from. Default: DISTRICT (+ TOWN when typing). */
  types?: Array<"DISTRICT" | "TOWN" | "TALUK">;
  editable?: boolean;
  containerStyle?: ViewStyle;
  autoApplyOnSelect?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
};

const MAX_SUGGESTIONS = 8;
const DEBOUNCE_MS = 220;

function dedupeByLabel(items: SuggestItem[]): SuggestItem[] {
  const seen = new Set<string>();
  const out: SuggestItem[] = [];
  for (const item of items) {
    const key = item.label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Text field with Master Data typeahead (districts / towns).
 * Prefetches DISTRICT; while typing, filters locally and optionally queries TOWN.
 */
export function MasterDataSuggestInput({
  value,
  onChangeText,
  onSelect,
  onSubmitEditing,
  placeholder = "City / district",
  types = ["DISTRICT", "TOWN"],
  editable = true,
  containerStyle,
  returnKeyType = "search"
}: Props) {
  const { colors, mode } = useTheme();
  const [districts, setDistricts] = useState<MasterDataItem[]>([]);
  const [remoteHits, setRemoteHits] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getMasterItems("DISTRICT")
      .then((items) => {
        if (!cancelled) setDistricts(items);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const localSuggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    if (!types.includes("DISTRICT")) return [];
    return districts
      .filter((d) => d.label.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS)
      .map((d) => ({
        id: `DISTRICT-${d.id}`,
        label: d.label,
        type: "DISTRICT"
      }));
  }, [districts, types, value]);

  const fetchRemote = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.trim().length < 2) {
        setRemoteHits([]);
        setLoadingRemote(false);
        return;
      }
      setLoadingRemote(true);
      debounceRef.current = setTimeout(() => {
        void (async () => {
          try {
            const wantsTown = types.includes("TOWN");
            const wantsTaluk = types.includes("TALUK");
            const [towns, taluks] = await Promise.all([
              wantsTown ? getMasterItems("TOWN", { q: q.trim() }) : Promise.resolve([]),
              wantsTaluk ? getMasterItems("TALUK", { q: q.trim() }) : Promise.resolve([])
            ]);
            const mapped: SuggestItem[] = [
              ...towns.map((t) => ({
                id: `TOWN-${t.id}`,
                label: t.label,
                type: "TOWN"
              })),
              ...taluks.map((t) => ({
                id: `TALUK-${t.id}`,
                label: t.label,
                type: "TALUK"
              }))
            ];
            setRemoteHits(mapped);
          } catch {
            setRemoteHits([]);
          } finally {
            setLoadingRemote(false);
          }
        })();
      }, DEBOUNCE_MS);
    },
    [types]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const suggestions = useMemo(() => {
    return dedupeByLabel([...localSuggestions, ...remoteHits]).slice(0, MAX_SUGGESTIONS);
  }, [localSuggestions, remoteHits]);

  const showList = focused && open && value.trim().length > 0 && (suggestions.length > 0 || loadingRemote);

  const handleChange = (text: string) => {
    selectedRef.current = false;
    onChangeText(text);
    setOpen(true);
    fetchRemote(text);
  };

  const handleSelect = (item: SuggestItem) => {
    selectedRef.current = true;
    onChangeText(item.label);
    setOpen(false);
    setRemoteHits([]);
    onSelect?.(item.label, item);
  };

  const typeLabel = (type: string) => {
    if (type === "DISTRICT") return "District";
    if (type === "TOWN") return "Town";
    if (type === "TALUK") return "Taluk";
    return type;
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: { position: "relative", zIndex: 20 },
        inputRow: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border,
          gap: spacing.sm
        },
        input: {
          flex: 1,
          ...textFieldCompact,
          color: colors.text
        },
        list: {
          position: "absolute",
          left: 0,
          right: 0,
          top: "100%",
          marginTop: 4,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          maxHeight: 240,
          zIndex: 50,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 8
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          gap: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        rowPressed: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#F0FDFA"
        },
        rowText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
        rowMeta: {
          fontSize: 11,
          fontWeight: "600",
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.4
        },
        loadingRow: {
          paddingVertical: 12,
          alignItems: "center",
          justifyContent: "center"
        },
        hint: {
          marginTop: 4,
          fontSize: 11,
          color: colors.textMuted
        }
      }),
    [colors, focused, mode]
  );

  return (
    <View style={[s.wrap, containerStyle]}>
      <View style={s.inputRow}>
        <Ionicons name="location-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={handleChange}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={() => {
            setOpen(false);
            onSubmitEditing?.();
          }}
          onFocus={() => {
            setFocused(true);
            if (value.trim()) {
              setOpen(true);
              fetchRemote(value);
            }
          }}
          onBlur={() => {
            // Delay so suggestion press registers before list hides
            setTimeout(() => {
              setFocused(false);
              setOpen(false);
            }, 180);
          }}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChangeText("");
              setRemoteHits([]);
              setOpen(false);
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {showList ? (
        <View style={s.list}>
          {suggestions.map((item, idx) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                s.row,
                idx === suggestions.length - 1 && !loadingRemote ? { borderBottomWidth: 0 } : null,
                pressed && s.rowPressed
              ]}
              onPress={() => handleSelect(item)}
            >
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={s.rowText} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={s.rowMeta}>{typeLabel(item.type)}</Text>
            </Pressable>
          ))}
          {loadingRemote ? (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
        </View>
      ) : null}

      {focused && value.trim().length > 0 && !showList && !loadingRemote ? (
        <Text style={s.hint}>No MDM match — you can still search free text</Text>
      ) : null}
    </View>
  );
}
