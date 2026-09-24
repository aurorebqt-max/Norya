import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { PreparationProvider } from "../src/state/PreparationProvider";
import { DemoProvider } from "../src/state/DemoProvider";
export default function Root() {
  return (
    <SafeAreaProvider>
      <PreparationProvider>
        <DemoProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9F5" }}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            />
          </SafeAreaView>
        </DemoProvider>
      </PreparationProvider>
    </SafeAreaProvider>
  );
}
