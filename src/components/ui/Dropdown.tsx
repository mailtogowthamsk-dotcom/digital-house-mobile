import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ViewStyle,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "../../theme/spacing";
import { TEXT_FIELD_MIN_HEIGHT, textFieldCompact } from "../../theme/textField";
import { ModalKeyboardAvoiding } from "./ModalKeyboardAvoiding";
import { useModalKeyboardPad } from "../../hooks/useModalKeyboardPad";

const ICON_COLOR = "#6B7280";

type DropdownProps = {
  label?: string;
  placeholder: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
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
  variant = "light",
  containerStyle,
  required
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { keyboardHeight, keyboardOpen } = useModalKeyboardPad();

  const isLight = variant === "light";
  const display = value ? options.find((o) => o.value === value)?.label ?? value : placeholder;
  const searchable = options.length > 8;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  const sheetHeight = keyboardOpen
    ? Math.max(windowHeight - keyboardHeight - Math.max(insets.top, 12) - 8, 280)
    : Math.min(Math.round(windowHeight * 0.72), 640);
  const sheetBottomPad = keyboardOpen ? spacing.sm : Math.max(insets.bottom, 16);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={[s.wrap, containerStyle]}>
      {label ? (
        <Text style={[s.label, isLight && s.labelLight]}>
          {label}
          {required ? " *" : ""}
        </Text>
      ) : null}
      <Pressable
        style={[s.inputRow, isLight && s.inputRowLight]}
        onPress={() => setOpen(true)}
      >
        <Text style={[s.inputText, !value && s.placeholder]} numberOfLines={1}>
          {display}
        </Text>
        <Ionicons name="chevron-down" size={20} color={ICON_COLOR} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss" />
          <ModalKeyboardAvoiding>
            <Pressable
              style={[s.sheet, { height: sheetHeight, paddingBottom: sheetBottomPad }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{placeholder}</Text>
                <Pressable onPress={close} hitSlop={12} accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color="#111827" />
                </Pressable>
              </View>
              {searchable ? (
                <View style={s.searchRow}>
                  <Ionicons name="search" size={18} color={ICON_COLOR} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search Tamil or English"
                    placeholderTextColor="#9CA3AF"
                    style={s.searchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {query ? (
                    <Pressable onPress={() => setQuery("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={ICON_COLOR} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <FlatList
                style={s.list}
                data={filtered}
                keyExtractor={(item, index) => `${item.value}-${index}`}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={
                  <Text style={s.empty}>No matches. Try Tamil or English name.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.option, value === item.value && s.optionSelected]}
                    onPress={() => {
                      onSelect(item.value);
                      close();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[s.optionText, value === item.value && s.optionTextSelected]}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                    {value === item.value ? (
                      <Ionicons name="checkmark" size={22} color="#2563EB" />
                    ) : null}
                  </TouchableOpacity>
                )}
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
  label: { fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 8 },
  labelLight: { color: "#6B7280" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    minHeight: TEXT_FIELD_MIN_HEIGHT,
    paddingHorizontal: 16
  },
  inputRowLight: {},
  inputText: { fontSize: 16, color: "#111827", flex: 1 },
  placeholder: { color: "#9CA3AF" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end"
  },
  sheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden"
  },
  list: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20
  },
  optionSelected: { backgroundColor: "rgba(37,99,235,0.08)" },
  optionText: { fontSize: 16, color: "#111827", flex: 1, paddingRight: 12 },
  optionTextSelected: { fontWeight: "600", color: "#2563EB" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    minHeight: TEXT_FIELD_MIN_HEIGHT,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  searchInput: { flex: 1, ...textFieldCompact, color: "#111827" },
  empty: {
    textAlign: "center",
    color: "#6B7280",
    paddingVertical: 24,
    paddingHorizontal: 20,
    fontSize: 14
  }
});
