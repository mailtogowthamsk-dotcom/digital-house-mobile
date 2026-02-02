import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.message}>
            The app hit an error. Try closing and reopening the app.
          </Text>
          <Pressable
            style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={s.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0B1220"
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12
  },
  message: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 24
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#E85D04",
    borderRadius: 8
  },
  buttonPressed: { opacity: 0.9 },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff"
  }
});
