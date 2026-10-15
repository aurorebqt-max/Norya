import { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Card,
  Txt,
  Chip,
  RowLink,
  Button,
  s,
} from "../components/ui";
import { colors as c } from "../design/theme";
import {
  examChapters,
  referenceBooks,
} from "../data/rezidentiat2026";

const bookLabels = {
  kumar: "Kumar",
  lawrence: "Lawrence",
  sinopsis: "Sinopsis",
} as const;

export default function Library() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tous");
  const filtered = useMemo(
    () =>
      examChapters.filter((chapter) => {
        const book = referenceBooks.find((entry) => entry.id === chapter.bookId)!;
        return (
          (filter === "Tous" || bookLabels[chapter.bookId] === filter) &&
          `${chapter.chapter} ${chapter.pages} ${chapter.scope.join(" ")} ${book.title}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase())
        );
      }),
    [filter, query],
  );

  return (
    <Screen
      title="Bibliothèque des cours"
      subtitle="Programme du résidanat roumain · Médecine · Référentiel 2026"
    >
      <TextInput
        style={s.input}
        accessibilityLabel="Rechercher un chapitre ou une page"
        placeholder="Rechercher un chapitre, un thème ou une page…"
        value={query}
        onChangeText={setQuery}
      />
      <View style={s.wrap}>
        {["Tous", "Kumar", "Lawrence", "Sinopsis"].map((label) => (
          <Chip
            key={label}
            label={label}
            selected={filter === label}
            onPress={() => setFilter(label)}
          />
        ))}
      </View>
      {filtered.map((chapter) => {
        const book = referenceBooks.find((entry) => entry.id === chapter.bookId)!;
        return (
          <Card key={chapter.id} style={{ padding: 18 }}>
            <Txt size={11} color={c.primary}>
              {book.title.toLocaleUpperCase()} · {book.edition} · {book.year}
            </Txt>
            <Txt bold size={18}>
              {chapter.chapter}
            </Txt>
            <Txt size={13} color={c.muted}>
              Pages de concours : {chapter.pages}
            </Txt>
            {chapter.scope.map((item) => (
              <Txt key={item} size={13}>
                · {item}
              </Txt>
            ))}
            <RowLink title="Ouvrir le chapitre" subtitle={chapter.id === 'kum-08' || chapter.id === 'kum-09' ? 'Version bêta · cours complet · fiches · flashcards' : chapter.id === 'kum-31' || chapter.id === 'kum-10' || chapter.id === 'kum-21' ? 'Cours complet · fiches · flashcards' : 'Contenu Norya en préparation'} href={{pathname:'/chapter',params:{id:chapter.id}}} />
            <Button
              title="Continuer dans Norya"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/chapter",
                  params: { id: chapter.id },
                })
              }
            />
          </Card>
        );
      })}
      {!filtered.length && (
        <Card>
          <Txt>Aucun chapitre trouvé dans cette sélection.</Txt>
        </Card>
      )}
    </Screen>
  );
}
