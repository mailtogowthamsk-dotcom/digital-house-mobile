import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  Keyboard,
  Platform,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { settingsField, textFieldCompactPad } from "../../theme/textField";
import { matrimonyLayout } from "./matrimonyLayout";
import { PrimaryButton } from "../ui/PrimaryButton";
import { getLocations, type OptionItem } from "../../api/options.api";
import { useModalKeyboardPad } from "../../hooks/useModalKeyboardPad";
import { ModalKeyboardAvoiding } from "../ui/ModalKeyboardAvoiding";
import type { DiscoverFilters } from "../../api/matrimony.api";

export type BrowseFilterState = {
  district: string;
  ageMin: string;
  ageMax: string;
  horoscopeOnly: boolean;
};

export const emptyBrowseFilters = (): BrowseFilterState => ({
  district: "",
  ageMin: "",
  ageMax: "",
  horoscopeOnly: false
});

export function toDiscoverParams(
  filters: BrowseFilterState,
  page: number,
  limit: number
): DiscoverFilters {
  const ageMin = filters.ageMin.trim() ? Number(filters.ageMin) : undefined;
  const ageMax = filters.ageMax.trim() ? Number(filters.ageMax) : undefined;
  return {
    page,
    limit,
    district: filters.district.trim() || undefined,
    ageMin: Number.isFinite(ageMin) ? ageMin : undefined,
    ageMax: Number.isFinite(ageMax) ? ageMax : undefined,
    horoscopeOnly: filters.horoscopeOnly || undefined
  };
}

export function hasActiveFilters(filters: BrowseFilterState): boolean {
  return (
    !!filters.district.trim() ||
    !!filters.ageMin.trim() ||
    !!filters.ageMax.trim() ||
    filters.horoscopeOnly
  );
}

const AGE_PRESETS: { label: string; min: string; max: string }[] = [
  { label: "20–25", min: "20", max: "25" },
  { label: "26–30", min: "26", max: "30" },
  { label: "31–35", min: "31", max: "35" },
  { label: "36–40", min: "36", max: "40" },
  { label: "41+", min: "41", max: "" }
];

type Props = {
  visible: boolean;
  initial: BrowseFilterState;
  onClose: () => void;
  onApply: (filters: BrowseFilterState) => void;
  onClear: () => void;
};

export function MatrimonyBrowseFilters({ visible, initial, onClose, onApply, onClear }: Props) {
  const { colors, mode } = useTheme();
  const accent = mode === "dark" ? "#F3B5D0" : "#753B56";
  const selectedFill = mode === "dark" ? "#753B5655" : "#FCECF1";
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { keyboardHeight, keyboardOpen } = useModalKeyboardPad();
  const scrollRef = useRef<ScrollView>(null);
  const districtOffsetY = useRef(0);

  const [draft, setDraft] = useState<BrowseFilterState>(initial);
  const [locations, setLocations] = useState<OptionItem[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [districtFocused, setDistrictFocused] = useState(false);

  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  useEffect(() => {
    if (!visible) return;
    setLoadingLoc(true);
    getLocations()
      .then(setLocations)
      .catch(() => setLocations([]))
      .finally(() => setLoadingLoc(false));
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setDistrictFocused(false);
      Keyboard.dismiss();
    }
  }, [visible]);

  const filteredLocations = useMemo(() => {
    const q = draft.district.trim().toLowerCase();
    const list = q
      ? locations.filter((loc) => loc.name.toLowerCase().includes(q))
      : locations;
    return list.slice(0, 40);
  }, [locations, draft.district]);

  const selectDistrict = (name: string) => {
    setDraft((d) => ({ ...d, district: name }));
    Keyboard.dismiss();
    setDistrictFocused(false);
  };

  const scrollToDistrict = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, districtOffsetY.current - 8), animated: true });
    });
  };

  const sheetBottomPad = keyboardOpen ? spacing.sm : Math.max(insets.bottom, spacing.md);
  const scrollBottomPad = keyboardOpen ? spacing.xl : spacing.md;
  const sheetMaxHeight = windowHeight * (keyboardOpen ? 0.72 : 0.88);
  const scrollMaxHeight = Math.max(120, sheetMaxHeight - 120 - sheetBottomPad);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close filters" />
        <ModalKeyboardAvoiding>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: sheetBottomPad,
                maxHeight: sheetMaxHeight
              }
            ]}
          >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Filter profiles</Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Same-kulam and partner preferences still apply.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            <View style={[styles.switchRow, { backgroundColor: selectedFill }]}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={[styles.label, { color: colors.text, marginBottom: 2 }]}>
                  Horoscope on file only
                </Text>
              </View>
              <Switch
                accessibilityLabel="Horoscope on file only"
                value={draft.horoscopeOnly}
                onValueChange={(horoscopeOnly) => setDraft((d) => ({ ...d, horoscopeOnly }))}
                trackColor={{ false: colors.border, true: accent }}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Age range</Text>
            <View style={styles.ageRow}>
              <TextInput
                value={draft.ageMin}
                onChangeText={(ageMin) => setDraft((d) => ({ ...d, ageMin: ageMin.replace(/\D/g, "") }))}
                placeholder="Min age"
                accessibilityLabel="Minimum age"
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                style={[
                  styles.input,
                  styles.ageInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }
                ]}
              />
              <Text style={{ color: colors.textMuted, fontWeight: "600" }}>to</Text>
              <TextInput
                value={draft.ageMax}
                onChangeText={(ageMax) => setDraft((d) => ({ ...d, ageMax: ageMax.replace(/\D/g, "") }))}
                placeholder="Max age"
                accessibilityLabel="Maximum age"
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                style={[
                  styles.input,
                  styles.ageInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }
                ]}
              />
            </View>
            <View style={styles.chipRow}>
              {AGE_PRESETS.map((preset) => {
                const active = draft.ageMin === preset.min && draft.ageMax === preset.max;
                return (
                  <Pressable
                    key={preset.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.chip,
                      {
                        borderColor: colors.border,
                        backgroundColor: active ? selectedFill : colors.surfaceElevated
                      }
                    ]}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        ageMin: preset.min,
                        ageMax: preset.max
                      }))
                    }
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: active ? accent : colors.text
                      }}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              onLayout={(e) => {
                districtOffsetY.current = e.nativeEvent.layout.y;
              }}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>District</Text>
              <View
                style={[
                  styles.searchRow,
                  {
                    borderColor: districtFocused ? colors.primary : colors.border,
                    backgroundColor: colors.surfaceElevated
                  }
                ]}
              >
                <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  value={draft.district}
                  onChangeText={(district) => setDraft((d) => ({ ...d, district }))}
                  placeholder="Search district"
                  accessibilityLabel="Search district"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="search"
                  blurOnSubmit
                  onFocus={() => {
                    setDistrictFocused(true);
                    scrollToDistrict();
                  }}
                  onBlur={() => setDistrictFocused(false)}
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {draft.district.length > 0 ? (
                  <Pressable
                    onPress={() => setDraft((d) => ({ ...d, district: "" }))}
                    hitSlop={8}
                    accessibilityLabel="Clear district"
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {loadingLoc ? (
                <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.primary} />
              ) : filteredLocations.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm }}>
                  {draft.district.trim()
                    ? "No matching districts. Try a different spelling."
                    : "District list unavailable."}
                </Text>
              ) : (
                <>
                  <Text style={[styles.chipHint, { color: colors.textSecondary }]}>
                    {draft.district.trim()
                      ? `${filteredLocations.length} match${filteredLocations.length === 1 ? "" : "es"}`
                      : "Popular districts"}
                  </Text>
                  <View style={styles.chipRow}>
                    {filteredLocations.map((loc, index) => {
                      const selected =
                        draft.district.trim().toLowerCase() === loc.name.toLowerCase();
                      return (
                        <Pressable
                          key={`loc-${loc.id}-${index}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          style={[
                            styles.chip,
                            {
                              borderColor: colors.border,
                              backgroundColor: selected ? selectedFill : colors.surfaceElevated
                            }
                          ]}
                          onPress={() => selectDistrict(loc.name)}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: selected ? accent : colors.text
                            }}
                          >
                            {loc.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable onPress={onClear} style={styles.clearBtn} accessibilityRole="button">
              <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>Clear all</Text>
            </Pressable>
            <PrimaryButton
              title="Apply filters"
              onPress={() => {
                Keyboard.dismiss();
                onApply(draft);
              }}
              style={{ ...matrimonyLayout.button, flex: 1, backgroundColor: "#753B56" }}
            />
          </View>
          </View>
        </ModalKeyboardAvoiding>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end"
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 6
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 3
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  title: { fontSize: 17, fontWeight: "800" },
  hint: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { paddingTop: spacing.xs },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.xs
  },
  label: { fontSize: 13, fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    ...settingsField,
    borderWidth: StyleSheet.hairlineWidth
  },
  searchInput: {
    flex: 1,
    ...textFieldCompactPad,
    minHeight: 44,
    paddingVertical: 6,
    fontSize: 14
  },
  input: {
    ...settingsField,
    ...textFieldCompactPad,
    paddingVertical: 6,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth
  },
  chipHint: { fontSize: 12, marginTop: spacing.sm, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    minHeight: 38,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth
  },
  ageRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ageInput: { flex: 1 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: 12
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  clearBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }
});
