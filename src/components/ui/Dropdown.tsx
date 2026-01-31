import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  ViewStyle
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "../../theme/spacing";

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

  const isLight = variant === "light";
  const display = value ? options.find((o) => o.value === value)?.label ?? value : placeholder;

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

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={s.modalOverlay} onPress={() => setOpen(false)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{placeholder}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.option, value === item.value && s.optionSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.optionText, value === item.value && s.optionTextSelected]}>
                    {item.label}
                  </Text>
                  {value === item.value ? (
                    <Ionicons name="checkmark" size={22} color="#2563EB" />
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
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
    minHeight: 52,
    paddingHorizontal: 16
  },
  inputRowLight: {},
  inputText: { fontSize: 16, color: "#111827", flex: 1 },
  placeholder: { color: "#9CA3AF" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 24
  },
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
    paddingVertical: 16,
    paddingHorizontal: 20
  },
  optionSelected: { backgroundColor: "rgba(37,99,235,0.08)" },
  optionText: { fontSize: 16, color: "#111827" },
  optionTextSelected: { fontWeight: "600", color: "#2563EB" }
});
