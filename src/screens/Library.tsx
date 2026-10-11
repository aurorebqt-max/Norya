import { passProgress } from "../domain/preparation/passes";
import { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Card,
  Txt,
  Chip,
  RowLink,
  Progress,
  Button,
  s,
} from "../components/ui";
import { colors as c } from "../design/theme";
import {
  examChapters,
  examProgramSource,
  referenceBooks,
} from "../data/rezidentiat2026";
import { objectives } from "../data/program";
import { usePreparation } from "../state/PreparationProvider";

const bookLabels = {
  kumar: "Kumar",
  lawrence: "Lawrence",
  sinopsis: "Sinopsis",
} as const;

export default function Library() {
  const { state } = usePreparation();
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
  const completed = objectives.filter(
    (objective) => passProgress(state.progress[objective.id],1).completedOn,
  ).length;

  return (
    <Screen
      title="Tematica · Medicină 2026"
      subtitle="Index des chapitres et pages explicitement inclus au concours."
    >
      <Card style={{ backgroundColor: c.mint }}>
        <Txt bold size={20}>
          Programme officiel · sesiunea noiembrie 2026
        </Txt>
        <Txt>
          {examProgramSource.title}. {examChapters.length} chapitres issus des
          trois ouvrages indiqués dans la bibliographie officielle.
        </Txt>
        <Progress value={(completed / examChapters.length) * 100} />
        <Txt size={12} color={c.muted}>
          {completed}/{examChapters.length} premiers passages enregistrés dans
          votre calendrier. Un passage déclaré ne mesure pas la maîtrise.
        </Txt>
        <Button
          title="Référentiel privé · gérer les PDF locaux"
          icon="lock-closed-outline"
          onPress={() => router.push("/references")}
        />
      </Card>
      <Card>
        <Txt bold>Limite du programme</Txt>
        <Txt size={13} color={c.muted}>
          {examProgramSource.scopeRule}
        </Txt>
      </Card>
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
        const objective = state.progress[chapter.id];
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
            <RowLink
              title="Ouvrir le référentiel privé"
              subtitle={
                passProgress(objective,1).completedOn
                  ? "Premier passage enregistré"
                  : "Source locale facultative · pages d’origine conservées"
              }
              icon="lock-closed-outline"
              href={{ pathname: "/references", params: { id: chapter.id } }}
            />
            <RowLink title="Fiche Norya · Complet / Express / RO–FR" subtitle={chapter.id === 'kum-08' ? 'Module sepsis disponible · couverture partielle' : 'Contenu en préparation · annotations disponibles'} href={{pathname:'/chapter',params:{id:chapter.id}}} />
            <Button
              title="Étudier ce chapitre"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/study",
                  params: { objectiveId: chapter.id },
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
