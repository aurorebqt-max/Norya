import { Tabs, router, usePathname } from "expo-router";
import { View, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { Icon, IconName, Txt, s } from "../../src/components/ui";
import { colors as c } from "../../src/design/theme";
import { usePreparation } from "../../src/state/PreparationProvider";
const links: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Accueil", icon: "grid-outline" },
  { name: "calendar", title: "Progression", icon: "stats-chart-outline" },
  { name: "library", title: "Bibliothèque", icon: "book-outline" },
  { name: "practice", title: "Entraînement", icon: "flash-outline" },
  { name: "coach", title: "Espace personnel", icon: "person-circle-outline" },
];
export default function Layout() {
  const wide = useWindowDimensions().width >= 1100;
  const path = usePathname();
  const { profile } = usePreparation();
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {wide && (
        <View
          style={{
            width: 230,
            flexShrink: 0,
            backgroundColor: c.paper,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            borderRightWidth: 1,
            borderColor: c.line,
            minHeight: 0,
          }}
        >
          <View style={[s.row, { paddingVertical: 10, marginBottom: 12 }]}>
            <View style={[s.iconBox, { backgroundColor: c.primary }]}>
              <Icon name="leaf" color="white" />
            </View>
            <Txt bold size={29}>
              norya.
            </Txt>
          </View>
          <Txt size={10} color={c.muted} style={{ letterSpacing: 2 }}>
            VOTRE ESPACE
          </Txt>
          <ScrollView
            style={{ flex: 1, minHeight: 0, marginTop: 8 }}
            contentContainerStyle={{ gap: 4, paddingBottom: 12 }}
            showsVerticalScrollIndicator
          >
            {links.filter((l) => l.name !== "coach").map((l) => {
              const activePath = l.name === "index" ? "/" : `/${l.name}`;
              return (
                <Pressable
                  key={l.name}
                  onPress={() =>
                    router.navigate(
                      l.name === "index" ? "/" : (activePath as any),
                    )
                  }
                  style={[
                    s.row,
                    {
                      padding: 11,
                      borderRadius: 13,
                      backgroundColor: path === activePath ? c.mint : "transparent",
                    },
                  ]}
                >
                  <Icon name={l.icon} size={20} />
                  <Txt size={14} numberOfLines={1} style={{ flex: 1 }}>
                    {l.title}
                  </Txt>
                </Pressable>
              );
            })}
            <View
              style={{ height: 1, backgroundColor: c.line, marginVertical: 12 }}
            />
            {[
              { title: "Calendrier", path: "/schedule", icon: "calendar-outline" },
              { title: "Coach Norya", path: "/mentor", icon: "sparkles-outline" },
              { title: "Écoute des cours", path: "/podcasts", icon: "headset-outline" },
              { title: "Mes Decks", path: "/flashcards", icon: "albums-outline" },
              { title: "Carnet d’erreurs", path: "/errors", icon: "layers-outline" },
            ].map((l) => (
              <Pressable
                key={l.path}
                onPress={() => router.push(l.path as any)}
                style={[s.row, { padding: 11, borderRadius: 13 }]}
              >
                <Icon name={l.icon as IconName} size={20} />
                <Txt size={14} numberOfLines={1} style={{ flex: 1 }}>
                  {l.title}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 68,
            paddingHorizontal: 28,
            borderBottomWidth: 1,
            borderColor: c.line,
            backgroundColor: c.paper,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Txt bold size={wide ? 14 : 23}>
            {wide ? "Mon espace  /  Ma préparation" : "norya."}
          </Txt>
          <View style={s.row}>
            <View
              style={{
                backgroundColor: c.mint,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
              }}
            >
              <Txt size={11} color={c.primary}>
                Rezidențiat · Medicină
              </Txt>
            </View>
            <Pressable
              accessibilityLabel="Profil et notifications"
              onPress={() => router.push("/profile")}
            >
              <View
                style={[
                  s.iconBox,
                  { width: 36, height: 36, backgroundColor: c.peach },
                ]}
              >
                <Txt bold>{profile.name.charAt(0)}</Txt>
              </View>
            </Pressable>
          </View>
        </View>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: c.primary,
            tabBarInactiveTintColor: c.muted,
            tabBarStyle: wide
              ? { display: "none" }
              : {
                  height: 72,
                  paddingTop: 9,
                  paddingBottom: 10,
                  borderTopColor: c.line,
                },
            tabBarLabelStyle: { fontSize: 10 },
          }}
        >
          {links.map((l) => (
            <Tabs.Screen
              key={l.name}
              name={l.name}
              options={{
                title: l.title,
                tabBarIcon: ({ color }) => <Icon name={l.icon} color={color} />,
              }}
            />
          ))}
        </Tabs>
      </View>
    </View>
  );
}
