import { Tabs, router, usePathname } from "expo-router";
import { View, Pressable, useWindowDimensions } from "react-native";
import { Icon, IconName, Txt, s } from "../../src/components/ui";
import { colors as c } from "../../src/design/theme";
import { usePreparation } from "../../src/state/PreparationProvider";
const links: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Accueil", icon: "grid-outline" },
  { name: "calendar", title: "Calendrier", icon: "calendar-outline" },
  { name: "library", title: "Bibliothèque", icon: "book-outline" },
  { name: "practice", title: "Entraînement", icon: "flash-outline" },
  { name: "coach", title: "Coach Norya", icon: "sparkles-outline" },
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
            backgroundColor: c.paper,
            padding: 25,
            borderRightWidth: 1,
            borderColor: c.line,
            gap: 26,
          }}
        >
          <View style={[s.row, { paddingVertical: 10 }]}>
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
          <View style={{ flex: 1, gap: 8 }}>
            {links.map((l) => (
              <Pressable
                key={l.name}
                onPress={() =>
                  router.navigate(
                    l.name === "index" ? "/" : (("/" + l.name) as any),
                  )
                }
                style={[
                  s.row,
                  {
                    padding: 14,
                    borderRadius: 13,
                    backgroundColor:
                      path === (l.name === "index" ? "/" : "/" + l.name)
                        ? c.mint
                        : "transparent",
                  },
                ]}
              >
                <Icon name={l.icon} size={20} />
                <Txt size={14}>{l.title}</Txt>
              </Pressable>
            ))}
            <View
              style={{ height: 1, backgroundColor: c.line, marginVertical: 18 }}
            />
            {[
              { title: "Mes Decks", path: "/flashcards", icon: "albums-outline" },
              { title: "Podcasts", path: "/podcasts", icon: "headset-outline" },
              {
                title: "Carnet d’erreurs",
                path: "/errors",
                icon: "layers-outline",
              },
              {
                title: "Ma progression",
                path: "/progress",
                icon: "stats-chart-outline",
              },
              { title: "Sources", path: "/sources", icon: "library-outline" },
              { title: "Stations ECOS", path: "/ecos", icon: "medkit-outline" },
            ].map((l) => (
              <Pressable
                key={l.path}
                onPress={() => router.push(l.path as any)}
                style={[s.row, { padding: 14 }]}
              >
                <Icon name={l.icon as IconName} size={20} />
                <Txt size={14}>{l.title}</Txt>
              </Pressable>
            ))}
          </View>
          <View
            style={{
              backgroundColor: c.mint,
              borderRadius: 18,
              padding: 16,
              gap: 10,
            }}
          >
            <Icon name="sparkles-outline" color={c.primary} />
            <Txt bold>Un peu chaque jour, beaucoup à l’arrivée.</Txt>
            <Txt size={12} color={c.muted}>
              Votre avenir se construit ici.
            </Txt>
          </View>
          <Pressable onPress={() => router.push("/profile")} style={s.row}>
            <View style={[s.iconBox, { backgroundColor: c.peach }]}>
              <Txt bold>{profile.name.charAt(0) || "N"}</Txt>
            </View>
            <View>
              <Txt bold>{profile.name}</Txt>
              <Txt size={12} color={c.muted}>
                {profile.exam} • {profile.year}
              </Txt>
            </View>
          </Pressable>
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
                Programme démo
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
