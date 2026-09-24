import { useState } from "react";
import { TextInput, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Screen, Card, Txt, Chip, Button, RowLink, s } from "../components/ui";
import { objectives } from "../data/program";
import { usePreparation } from "../state/PreparationProvider";
import { items } from "../data/demo";
import { colors as c } from "../design/theme";
export default function Item() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = items.find((x) => x.id === id);
  const { state, saveNote } = usePreparation();
  const notes = state.notes;
  const [tab, setTab] = useState("Synthèse");
  const [note, setNote] = useState(notes[id] ?? "");
  const [saved, setSaved] = useState(false);
  if (!item)
    return (
      <Screen title="Item introuvable" back>
        <Button
          title="Bibliothèque"
          onPress={() => router.replace("/library")}
        />
      </Screen>
    );
  return (
    <Screen
      title={item.title}
      subtitle={item.subject + " · Fiche de démonstration"}
      back
    >
      <View style={s.wrap}>
        {["Synthèse", "Approfondir", "Notions liées", "Mes annotations"].map(
          (x) => (
            <Chip
              key={x}
              label={x}
              selected={x === tab}
              onPress={() => setTab(x)}
            />
          ),
        )}
      </View>
      <Card>
        <Txt size={12} color={c.primary}>
          SUPPORT ÉDITORIAL FICTIF · NON VALIDÉ MÉDICALEMENT
        </Txt>
        {tab === "Synthèse" && (
          <>
            <Txt bold size={22}>
              Comprendre avant de mémoriser
            </Txt>
            <Txt>
              Cette fiche illustre la structure d’un futur contenu : objectifs
              pédagogiques, notions essentielles et points de vigilance.
            </Txt>
            <Txt bold>01 · Poser les repères</Txt>
            <Txt color={c.muted}>
              Le contenu médical sera intégré après sélection des sources et
              validation éditoriale.
            </Txt>
            <Txt bold>02 · Vérifier sa compréhension</Txt>
            <Txt color={c.muted}>
              Reformulez les objectifs de la séance, puis identifiez les notions
              à reprendre.
            </Txt>
            {objectives
              .filter((o) => o.subject === item.subject)
              .map((o) => (
                <RowLink
                  key={o.id}
                  title={o.title}
                  subtitle={
                    o.initialMinutes +
                    " min · " +
                    (state.progress[o.id]?.initialCompletedOn
                      ? "Parcouru"
                      : "Premier passage à terminer")
                  }
                  href={{ pathname: "/study", params: { objectiveId: o.id } }}
                />
              ))}
            <Button
              title="Démarrer une séance"
              onPress={() =>
                router.push({
                  pathname: "/study",
                  params: {
                    objectiveId: objectives.find(
                      (o) => o.subject === item.subject,
                    )!.id,
                  },
                })
              }
            />
          </>
        )}
        {tab === "Approfondir" && (
          <>
            <Txt bold size={22}>
              Aller plus loin
            </Txt>
            <Txt>
              Les explications détaillées, références et recommandations datées
              prendront place ici. Aucun contenu clinique n’est simulé.
            </Txt>
            <Button
              title="Préparer ma méthode avec le coach"
              secondary
              onPress={() => router.push("/coach")}
            />
          </>
        )}
        {tab === "Notions liées" &&
          items
            .filter((x) => x.id !== item.id)
            .slice(0, 2)
            .map((x) => (
              <RowLink
                key={x.id}
                title={x.subject}
                subtitle="Autre fiche à explorer · lien de navigation de démonstration"
                href={"/item?id=" + x.id}
              />
            ))}
        {tab === "Mes annotations" && (
          <>
            <Txt bold>Votre espace pour faire des liens</Txt>
            <TextInput
              multiline
              style={[s.input, { minHeight: 160, textAlignVertical: "top" }]}
              accessibilityLabel="Annotation personnelle"
              placeholder="Ce que je veux retenir…"
              value={note}
              onChangeText={(v) => {
                setNote(v);
                setSaved(false);
              }}
            />
            <Button
              title={
                saved ? "Annotation enregistrée" : "Enregistrer mon annotation"
              }
              onPress={() => {
                void saveNote(id, note)
                  .then(() => setSaved(true))
                  .catch(() => setSaved(false));
              }}
            />
            <Txt size={12} color={c.muted}>
              Conservée sur cet appareil.
            </Txt>
          </>
        )}
      </Card>
    </Screen>
  );
}
