import { useState } from "react";
import { View, TextInput } from "react-native";
import {
  Screen,
  Card,
  Txt,
  Chip,
  RowLink,
  Progress,
  s,
} from "../components/ui";
import { colors as c } from "../design/theme";
import { items as demoItems } from "../data/demo";
import { objectives } from "../data/program";
import { usePreparation } from "../state/PreparationProvider";
export default function Library() {
  const { state } = usePreparation();
  const items = demoItems.map((item) => {
    const list = objectives.filter((o) => o.subject === item.subject);
    return {
      ...item,
      progress: Math.round(
        (list.filter((o) => state.progress[o.id]?.initialCompletedOn).length /
          list.length) *
          100,
      ),
    };
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const filtered = items.filter(
    (x) =>
      (filter === "Toutes" ||
        (filter === "En cours" ? x.progress > 0 : x.progress === 0)) &&
      (x.title + " " + x.subject).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Screen
      title="La bibliothèque"
      subtitle="Tout le programme, à portée de main."
    >
      <TextInput
        style={s.input}
        accessibilityLabel="Rechercher une matière ou un item"
        placeholder="Rechercher une matière, un item, une notion…"
        value={query}
        onChangeText={setQuery}
      />
      <View style={s.wrap}>
        {["Toutes", "En cours", "À découvrir"].map((x) => (
          <Chip
            key={x}
            label={x}
            selected={filter === x}
            onPress={() => setFilter(x)}
          />
        ))}
      </View>
      <Txt size={12} color={c.muted}>
        7 MATIÈRES DE DÉMONSTRATION · ACCÈS À TOUTES LES SPÉCIALITÉS
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
        {filtered.map((x) => (
          <Card key={x.id} style={{ flexGrow: 1, flexBasis: 300 }}>
            <RowLink
              title={x.subject}
              subtitle={x.title + " · Rang " + x.rank + " illustratif"}
              icon="book-outline"
              href={"/item?id=" + x.id}
            />
            <Progress value={x.progress} />
            <Txt size={12} color={c.muted}>
              {x.progress}% parcourus · Programme démo
            </Txt>
          </Card>
        ))}
      </View>
      {!filtered.length && (
        <Card>
          <Txt>Aucun résultat. Essayez une autre matière.</Txt>
        </Card>
      )}
    </Screen>
  );
}
