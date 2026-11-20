import { StyleSheet } from "react-native";

export const feedVideoControlStyles = StyleSheet.create({
  play: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(15,23,42,0.76)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center"
  },
  pressed: {
    backgroundColor: "rgba(15,23,42,0.93)"
  },
  playIcon: { marginLeft: 2 }
});
