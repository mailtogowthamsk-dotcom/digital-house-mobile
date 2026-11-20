import { StyleSheet } from "react-native";
import { radius, spacing } from "../../theme/spacing";

export const matrimonyLayout = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  button: {
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md
  }
});
