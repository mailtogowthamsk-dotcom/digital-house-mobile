import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing, radius } from "../../theme/spacing";
import { TEXT_FIELD_MIN_HEIGHT, textFieldCompact } from "../../theme/textField";
import { ModalKeyboardAvoiding } from "./ModalKeyboardAvoiding";
import { useModalKeyboardPad } from "../../hooks/useModalKeyboardPad";
import { useTheme } from "../../theme/ThemeContext";

export type SearchMultiSelectItem = {
  id: number;
  name: string;
  displayName?: string | null;
};

type Props = {
  label: string;
  placeholder?: string;
  note?: string;
  items: SearchMultiSelectItem[];
  selected: number[];
  onChange: (ids: number[]) => void;
  excludeIds?: number[];
};

export function SearchMultiSelect({
  label,
  placeholder = "Select",
  note,
  items,
  selected,
  onChange,
  excludeIds = []
}: Props) {
  const { colors, mode } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { keyboardHeight, keyboardOpen } = useModalKeyboardPad();

  const available = useMemo(
    () => items.filter((i) => !excludeIds.includes(i.id)),
    [items, excludeIds]
  );

  const selectedItems = useMemo(() => {
    const map = new Map(available.map((i) => [i.id, i]));
    return selected.map((id) => map.get(id)).filter(Boolean) as SearchMultiSelectItem[];
  }, [available, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((i) => {
      const labelText = (i.displayName || i.name || "").toLowerCase();
      return labelText.includes(q) || String(i.name).toLowerCase().includes(q);
    });
  }, [available, query]);

  const sheetHeight = keyboardOpen
    ? Math.max(windowHeight - keyboardHeight - Math.max(insets.top, 12) - 8, 280)
    : Math.min(Math.round(windowHeight * 0.72), 640);
  const sheetBottomPad = keyboardOpen ? spacing.sm : Math.max(insets.bottom, 16);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const toggle = (id: number) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };

  const remove = (id: number) => onChange(selected.filter((x) => x !== id));

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selectedItems[0]?.displayName || selectedItems[0]?.name || "1 selected"
        : `${selected.length} selected`;

  const optionIdleBg = mode === "dark" ? colors.surfaceElevated : colors.background;
  const optionSelectedBg =
    mode === "dark" ? "rgba(37, 99, 235, 0.22)" : "rgba(37, 99, 235, 0.1)";
  const chipBg = mode === "dark" ? "rgba(37, 99, 235, 0.22)" : "rgba(37, 99, 235, 0.1)";

  return (
    <View style={s.wrap}>
      <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
      {note ? <Text style={[s.note, { color: colors.textSecondary }]}>{note}</Text> : null}

      <Pressable
        style={[
          s.inputRow,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
        ]}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[
            s.inputText,
            { color: selected.length ? colors.text : colors.textMuted }
          ]}
          numberOfLines={1}
        >
          {summary}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>

      {selectedItems.length > 0 ? (
        <View style={s.chips}>
          {selectedItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => remove(item.id)}
              style={[s.chip, { backgroundColor: chipBg, borderColor: colors.primary }]}
              accessibilityLabel={`Remove ${item.displayName || item.name}`}
            >
              <Text style={[s.chipText, { color: colors.primary }]} numberOfLines={1}>
                {item.displayName || item.name}
              </Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

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
                  backgroundColor: colors.surface,
                  borderColor: colors.border
                }
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={s.handleWrap}>
                <View style={[s.handle, { backgroundColor: colors.textMuted }]} />
              </View>

              <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[s.modalTitle, { color: colors.text }]} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={[s.modalSubtitle, { color: colors.textSecondary }]}>
                    {selected.length === 0
                      ? "Optional — tap to select multiple"
                      : `${selected.length} selected`}
                  </Text>
                </View>
                <Pressable
                  onPress={close}
                  hitSlop={12}
                  accessibilityLabel="Done"
                  style={[
                    s.doneBtn,
                    { backgroundColor: optionIdleBg, borderColor: colors.border }
                  ]}
                >
                  <Text style={[s.doneText, { color: colors.primary }]}>Done</Text>
                </Pressable>
              </View>

              <View
                style={[
                  s.searchRow,
                  { backgroundColor: optionIdleBg, borderColor: colors.border }
                ]}
              >
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search Tamil or English"
                  placeholderTextColor={colors.textMuted}
                  style={[s.searchInput, { color: colors.text }]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoFocus
                />
                {query ? (
                  <Pressable onPress={() => setQuery("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </Pressable>
                ) : null}
              </View>

              <FlatList
                style={s.list}
                contentContainerStyle={s.listContent}
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <Text style={[s.empty, { color: colors.textSecondary }]}>
                    No matches. Try Tamil or English name.
                  </Text>
                }
                renderItem={({ item }) => {
                  const active = selected.includes(item.id);
                  return (
                    <Pressable
                      style={[
                        s.option,
                        {
                          backgroundColor: active ? optionSelectedBg : optionIdleBg,
                          borderColor: active ? colors.primary : colors.border
                        }
                      ]}
                      onPress={() => toggle(item.id)}
                    >
                      <View
                        style={[
                          s.checkBox,
                          {
                            borderColor: active ? colors.primary : colors.textMuted,
                            backgroundColor: active ? colors.primary : "transparent"
                          }
                        ]}
                      >
                        {active ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                      </View>
                      <Text
                        style={[
                          s.optionText,
                          { color: active ? colors.primary : colors.text },
                          active && s.optionTextSelected
                        ]}
                        numberOfLines={2}
                      >
                        {item.displayName || item.name}
                      </Text>
                      {active ? (
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
  note: { fontSize: 12, lineHeight: 16, marginBottom: 8, marginTop: -4 },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1
  },
  chipText: { fontSize: 12, fontWeight: "600", maxWidth: 220 },
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
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
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
  doneBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth
  },
  doneText: { fontSize: 15, fontWeight: "700" },
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
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  optionText: { fontSize: 16, flex: 1 },
  optionTextSelected: { fontWeight: "700" },
  empty: {
    textAlign: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    fontSize: 14
  }
});
