import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { configurePushNotifications } from "./src/services/pushNotifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { rootLinking } from "./src/navigation/linking";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { AppAlertProvider } from "./src/context/AppAlertContext";
import { AuthProvider, useAuth, type RootAuthRoute } from "./src/context/AuthContext";
import { PlatformProvider } from "./src/context/PlatformContext";
import { PlatformGateOverlay } from "./src/components/platform/PlatformGateOverlay";
import { AuthSplash } from "./src/components/auth/AuthSplash";
import { LandingScreen } from "./src/screens/landing/LandingScreen";
import { RegistrationScreen } from "./src/screens/auth/RegistrationScreen";
import { PendingApprovalScreen } from "./src/screens/auth/PendingApprovalScreen";
import { RejectedScreen } from "./src/screens/auth/RejectedScreen";
import { LoginScreen } from "./src/screens/auth/LoginScreen";
import { OtpVerifyScreen } from "./src/screens/auth/OtpVerifyScreen";
import { GoogleCompleteProfileScreen } from "./src/screens/auth/GoogleCompleteProfileScreen";
import { SetUsernameScreen } from "./src/screens/auth/SetUsernameScreen";
import { SearchMembersScreen } from "./src/screens/members/SearchMembersScreen";
import { MemberProfileScreen } from "./src/screens/members/MemberProfileScreen";
import { ConnectionsScreen } from "./src/screens/members/ConnectionsScreen";
import { HomeScreen } from "./src/screens/home/HomeScreen";
import { ProfileScreen } from "./src/screens/home/ProfileScreen";
import { EditProfileScreen } from "./src/screens/home/EditProfileScreen";
import { MyPostsScreen } from "./src/screens/home/MyPostsScreen";
import { MyActivityScreen } from "./src/screens/home/MyActivityScreen";
import { PostDetailScreen } from "./src/screens/home/PostDetailScreen";
import { CreatePostScreen } from "./src/screens/home/CreatePostScreen";
import { MenuScreen } from "./src/screens/home/MenuScreen";
import { SettingsScreen } from "./src/screens/home/SettingsScreen";
import { MessagesHubScreen } from "./src/screens/messages/MessagesHubScreen";
import { ChatScreen } from "./src/screens/messages/ChatScreen";
import { MatrimonyHomeScreen } from "./src/screens/matrimony/MatrimonyHomeScreen";
import { JobsHomeScreen } from "./src/screens/jobs/JobsHomeScreen";
import { MarketplaceHomeScreen } from "./src/screens/marketplace/MarketplaceHomeScreen";
import { HelpingHandsHomeScreen } from "./src/screens/helpingHands/HelpingHandsHomeScreen";
import { CreateHelpRequestScreen } from "./src/screens/helpingHands/CreateHelpRequestScreen";
import { MatrimonySetupScreen } from "./src/screens/matrimony/MatrimonySetupScreen";
import { MatrimonyBrowseScreen } from "./src/screens/matrimony/MatrimonyBrowseScreen";
import { MatrimonyCandidateScreen } from "./src/screens/matrimony/MatrimonyCandidateScreen";
import { MatrimonyInterestsScreen } from "./src/screens/matrimony/MatrimonyInterestsScreen";
import { MatrimonyMatchesScreen } from "./src/screens/matrimony/MatrimonyMatchesScreen";
import { MatrimonySavedScreen } from "./src/screens/matrimony/MatrimonySavedScreen";
import { MatrimonyPlansScreen } from "./src/screens/matrimony/MatrimonyPlansScreen";
import { MatrimonyMySubscriptionScreen } from "./src/screens/matrimony/MatrimonyMySubscriptionScreen";
import { MatrimonyViewsScreen } from "./src/screens/matrimony/MatrimonyViewsScreen";
import { NotificationCenterScreen } from "./src/screens/notifications/NotificationCenterScreen";
import { NotificationProvider } from "./src/context/NotificationContext";
import { PushNotificationBootstrap } from "./src/components/notifications/PushNotificationBootstrap";
import { RazorpayWebCheckoutHost } from "./src/components/payments/RazorpayWebCheckoutHost";
import { navigationRef } from "./src/navigation/rootNavigation";
import type { RootStackParamList } from "./src/navigation/types";

export type { RootStackParamList };

const Stack = createNativeStackNavigator<RootStackParamList>();

function StackNavigator({ initialRoute }: { initialRoute: RootAuthRoute }) {
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator
        initialRouteName={initialRoute}
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
        <Stack.Screen
          name="GoogleCompleteProfile"
          component={GoogleCompleteProfileScreen}
          options={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
        />
        <Stack.Screen
          name="SetUsername"
          component={SetUsernameScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SearchMembers" component={SearchMembersScreen} options={{ title: "Find Members" }} />
        <Stack.Screen name="Connections" component={ConnectionsScreen} options={{ title: "Connections" }} />
        <Stack.Screen name="MemberProfile" component={MemberProfileScreen} options={{ title: "Member Profile" }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
        <Stack.Screen name="MyPosts" component={MyPostsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyActivity" component={MyActivityScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: "Post" }} />
        <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: "Create Post" }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
        <Stack.Screen
          name="Notifications"
          component={NotificationCenterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Messages" component={MessagesHubScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="JobsHome" component={JobsHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MarketplaceHome" component={MarketplaceHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="HelpingHandsHome" component={HelpingHandsHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreateHelpRequest" component={CreateHelpRequestScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MatrimonyHome" component={MatrimonyHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MatrimonySetup" component={MatrimonySetupScreen} options={{ title: "Matrimony Profile" }} />
        <Stack.Screen name="MatrimonyBrowse" component={MatrimonyBrowseScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MatrimonyCandidate" component={MatrimonyCandidateScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MatrimonyInterests" component={MatrimonyInterestsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MatrimonyMatches" component={MatrimonyMatchesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MatrimonySaved" component={MatrimonySavedScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MatrimonyPlans" component={MatrimonyPlansScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="MatrimonyMySubscription"
          component={MatrimonyMySubscriptionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="MatrimonyViews" component={MatrimonyViewsScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </>
  );
}

function AppNavigation() {
  const { status, initialRoute, sessionEpoch } = useAuth();

  if (status === "loading") {
    return <AuthSplash />;
  }

  /**
   * Remount the ENTIRE NavigationContainer when the auth gate flips
   * (signed-out ↔ signed-in). Remounting only StackNavigator inside a sticky
   * container left users stuck on OtpVerify after a successful OTP verify,
   * even though the token was already saved (cold start then looked "logged in").
   */
  const navKey =
    status === "signedOut"
      ? `auth:${sessionEpoch}`
      : `app:${sessionEpoch}:${initialRoute}`;

  return (
    <NavigationContainer key={navKey} ref={navigationRef} linking={rootLinking as any}>
      <StackNavigator initialRoute={initialRoute} />
      <PushNotificationBootstrap />
      <PlatformGateOverlay />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    void configurePushNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppErrorBoundary>
        <SafeAreaProvider initialWindowMetrics={initialWindowMetrics}>
          <ThemeProvider>
            <AppAlertProvider>
              <AuthProvider>
                <PlatformProvider>
                  <NotificationProvider>
                    <AppNavigation />
                    <RazorpayWebCheckoutHost />
                  </NotificationProvider>
                </PlatformProvider>
              </AuthProvider>
            </AppAlertProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }
});
