import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OtpVerifyScreen } from "../screens/auth/OtpVerifyScreen";
import { HomeScreen } from "../screens/home/HomeScreen";

export type RootStackParamList = {
  Login: undefined;
  OtpVerify: { email: string };
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1220" },
        headerTintColor: "#FFFFFF",
        contentStyle: { backgroundColor: "#0B1220" }
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Sign in", contentStyle: { backgroundColor: "transparent" } }}
      />
      <Stack.Screen
        name="OtpVerify"
        component={OtpVerifyScreen}
        options={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
      />
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Digital House" }} />
    </Stack.Navigator>
  );
}

