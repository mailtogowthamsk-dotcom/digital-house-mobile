import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { LandingScreen } from "./src/screens/landing/LandingScreen";
import { RegistrationScreen } from "./src/screens/auth/RegistrationScreen";
import { PendingApprovalScreen } from "./src/screens/auth/PendingApprovalScreen";
import { RejectedScreen } from "./src/screens/auth/RejectedScreen";
import { LoginScreen } from "./src/screens/auth/LoginScreen";
import { OtpVerifyScreen } from "./src/screens/auth/OtpVerifyScreen";
import { HomeScreen } from "./src/screens/home/HomeScreen";
import { ProfileScreen } from "./src/screens/home/ProfileScreen";
import { EditProfileScreen } from "./src/screens/home/EditProfileScreen";
import { PostDetailScreen } from "./src/screens/home/PostDetailScreen";
import { CreatePostScreen } from "./src/screens/home/CreatePostScreen";
import { colors } from "./src/theme/colors";

export type RootStackParamList = {
  Landing: undefined;
  Registration: undefined;
  PendingApproval: undefined;
  Rejected: { message?: string };
  Login: undefined;
  OtpVerify: { email: string };
  Home: undefined;
  Profile: undefined;
  EditProfile: undefined;
  PostDetail: { postId: number };
  CreatePost: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AppErrorBoundary>
    <SafeAreaProvider>
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: true,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          options={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
        />
        <Stack.Screen
          name="Registration"
          component={RegistrationScreen}
          options={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
        />
        <Stack.Screen
          name="PendingApproval"
          component={PendingApprovalScreen}
          options={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
        />
        <Stack.Screen
          name="Rejected"
          component={RejectedScreen}
          options={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
        />
        <Stack.Screen
          name="OtpVerify"
          component={OtpVerifyScreen}
          options={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
        />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: "Post" }} />
        <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: "Create Post" }} />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
