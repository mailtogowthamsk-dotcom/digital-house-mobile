import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { spacing } from "../../theme/spacing";

type DobDatePickerProps = {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
  /** Accent for the iOS Done action */
  doneColor?: string;
};

/**
 * Date-of-birth picker: Android dialog auto-closes on confirm;
 * iOS spinner stays open while scrolling and closes via Done / dismiss.
 */
export function DobDatePicker({
  visible,
  value,
  onChange,
  onClose,
  maximumDate,
  minimumDate,
  doneColor = "#2563EB"
}: DobDatePickerProps) {
  if (!visible) return null;

  return (
    <View>
      <DateTimePicker
        value={value}
        mode="date"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        onValueChange={(_, date) => {
          onChange(date);
          if (Platform.OS === "android") onClose();
        }}
        onDismiss={onClose}
      />
      {Platform.OS === "ios" ? (
        <Pressable
          style={styles.doneBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Done selecting date"
        >
          <Text style={[styles.doneText, { color: doneColor }]}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  doneBtn: {
    paddingVertical: spacing.sm,
    alignItems: "flex-end",
    marginBottom: spacing.md
  },
  doneText: {
    fontSize: 16,
    fontWeight: "600"
  }
});
