import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  ViewStyle,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing, radius } from "../../theme/spacing";
import { TEXT_FIELD_MIN_HEIGHT, textFieldCompact } from "../../theme/textField";
import { ModalKeyboardAvoiding } from "./ModalKeyboardAvoiding";
import { useModalKeyboardPad } from "../../hooks/useModalKeyboardPad";
import { useTheme } from "../../theme/ThemeContext";

type DropdownProps = {
  label?: string;
  placeholder: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  /** Force light field chrome (e.g. light form cards). Sheet still follows app theme. */
  variant?: "default" | "light";
  containerStyle?: ViewStyle;
  required?: boolean;
};

export function Dropdown({
  label,
  placeholder,
  value,
  options,
  onSelect,
  variant = "default",
  containerStyle,
  required
}: DropdownProps) {
  const { colors, mode } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { keyboardHeight, keyboardOpen } = useModalKeyboardPad();

  const forceLightField = variant === "light";
  const display = value ? options.find((o) => o.value === value)?.label ?? value : placeholder;
  const searchable = options.length > 8;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  const estimatedListH = Math.min(
    filtered.length * 56 + (searchable ? 64 : 0) + 88,
    Math.round(windowHeight * 0.72)
  );
  const sheetHeight = keyboardOpen
    ? Math.max(windowHeight - keyboardHeight - Math.max(insets.top, 12) - 8, 280)
    : Math.max(240, Math.min(estimatedListH + Math.max(insets.bottom, 12), Math.round(windowHeight * 0.72)));
  const sheetBottomPad = keyboardOpen ? spacing.sm : Math.max(insets.bottom, 16);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const fieldBg = forceLightField ? "#F3F4F6" : colors.surfaceElevated;
  const fieldBorder = forceLightField ? "#E5E7EB" : colors.border;
  const fieldText = forceLightField ? "#111827" : colors.text;
  const fieldPlaceholder = forceLightField ? "#9CA3AF" : colors.textMuted;
  const fieldIcon = forceLightField ? "#6B7280" : colors.textSecondary;
  const labelColor = forceLightField ? "#6B7280" : colors.textSecondary;

  const sheetBg = colors.surface;
  const sheetBorder = colors.border;
  const titleColor = colors.text;
  const muted = colors.textSecondary;
  const optionIdleBg = mode === "dark" ? colors.surfaceElevated : colors.background;
  const optionSelectedBg =
    mode === "dark" ? "rgba(37, 99, 235, 0.22)" : "rgba(37, 99, 235, 0.1)";

  return (
    <View style={[s.wrap, containerStyle]}>
      {label ? (
        <Text style={[s.label, { color: labelColor }]}>
          {label}
          {required ? " *" : ""}
        </Text>
      ) : null}
      <Pressable
        style={[s.inputRow, { backgroundColor: fieldBg, borderColor: fieldBorder }]}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[s.inputText, { color: value ? fieldText : fieldPlaceholder }]}
          numberOfLines={1}
        >
          {display}
        </Text>
        <Ionicons name="chevron-down" size={20} color={fieldIcon} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View style={[s.overlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss" />
          <ModalKeyboardAvoiding>
            <Pressable
              style={[
                s.sheet,
                {
                  height: sheetHeight,
                  paddingBottom: sheetBottomPad,
                  backgroundColor: sheetBg,
                  borderColor: sheetBorder
                }
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={s.handleWrap}>
                <View style={[s.handle, { backgroundColor: colors.textMuted }]} />
              </View>

              <View style={[s.modalHeader, { borderBottomColor: sheetBorder }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[s.modalTitle, { color: titleColor }]} numberOfLines={1}>
                    {label?.replace(/\s*\*$/, "") || placeholder}
                  </Text>
                  <Text style={[s.modalSubtitle, { color: muted }]}>
                    {filtered.length} option{filtered.length === 1 ? "" : "s"}
                  </Text>
                </View>
                <Pressable
                  onPress={close}
                  hitSlop={12}
                  accessibilityLabel="Close"
                  style={[s.closeBtn, { backgroundColor: optionIdleBg, borderColor: sheetBorder }]}
                >
                  <Ionicons name="close" size={20} color={titleColor} />
                </Pressable>
              </View>

              {searchable ? (
                <View
                  style={[
                    s.searchRow,
                    { backgroundColor: optionIdleBg, borderColor: sheetBorder }
                  ]}
                >
                  <Ionicons name="search" size={18} color={muted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search Tamil or English"
                    placeholderTextColor={colors.textMuted}
                    style={[s.searchInput, { color: titleColor }]}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {query ? (
                    <Pressable onPress={() => setQuery("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={muted} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <FlatList
                style={s.list}
                contentContainerStyle={s.listContent}
                data={filtered}
                keyExtractor={(item, index) => `${item.value}-${index}`}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <Text style={[s.empty, { color: muted }]}>
                    No matches. Try Tamil or English name.
                  </Text>
                }
                renderItem={({ item }) => {
                  const selected = value === item.value;
                  return (
                    <Pressable
                      style={[
                        s.option,
                        {
                          backgroundColor: selected ? optionSelectedBg : optionIdleBg,
                          borderColor: selected ? colors.primary : sheetBorder
                        }
                      ]}
                      onPress={() => {
                        onSelect(item.value);
                        close();
                      }}
                    >
                      <View
                        style={[
                          s.radio,
                          {
                            borderColor: selected ? colors.primary : colors.textMuted,
                            backgroundColor: selected ? colors.primary : "transparent"
                          }
                        ]}
                      >
                        {selected ? <View style={s.radioDot} /> : null}
                      </View>
                      <Text
                        style={[
                          s.optionText,
                          { color: selected ? colors.primary : titleColor },
                          selected && s.optionTextSelected
                        ]}
                        numberOfLines={2}
                      >
                        {item.label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      )}
                    </Pressable>
                  );
                }}
              />
            </Pressable>
          </ModalKeyboardAvoiding>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    minHeight: TEXT_FIELD_MIN_HEIGHT,
    paddingHorizontal: 16
  },
  inputText: { fontSize: 16, flex: 1, paddingRight: 8 },
  overlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    overflow: "hidden"
  },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2, opacity: 0.45 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalSubtitle: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF"
  },
  optionText: { fontSize: 16, flex: 1 },
  optionTextSelected: { fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    minHeight: TEXT_FIELD_MIN_HEIGHT,
    borderRadius: 14,
    borderWidth: 1
  },
  searchInput: { flex: 1, ...textFieldCompact },
  empty: {
    textAlign: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    fontSize: 14
  }
});
