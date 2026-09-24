import { useEffect, useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Speech from "expo-speech";
import { Screen, Card, Txt, Chip, Button, RowLink, Progress, s } from "../components/ui";
import { objectives } from "../data/program";
import { usePreparation } from "../state/PreparationProvider";
import { items } from "../data/demo";
import { colors as c } from "../design/theme";
import { nephroticSheet, medicalObjectives, medicalSources } from "../data/medical";
import { useDemo } from "../state/DemoProvider";

export default function Item() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = items.find((x) => x.id === id);
  const { state, saveNote } = usePreparation();
  const [tab, setTab] = useState("Synthèse");
  const [note, setNote] = useState(state.notes[id] ?? "");
  const [saved, setSaved] = useState(false);
  if (!item)
    return <Screen title="Item introuvable" back><Button title="Bibliothèque" onPress={() => router.replace("/library")} /></Screen>;
  if (item.id === "nephro") return <NephroticSheetView />;
  return (
    <Screen title={item.title} subtitle={item.subject + " · Fiche de démonstration"} back>
      <View style={s.wrap}>{["Synthèse", "Approfondir", "Notions liées", "Mes annotations"].map((x) => <Chip key={x} label={x} selected={x === tab} onPress={() => setTab(x)} />)}</View>
      <Card>
        <Txt size={12} color={c.primary}>SUPPORT ÉDITORIAL FICTIF · NON VALIDÉ MÉDICALEMENT</Txt>
        {tab === "Synthèse" && <>
          <Txt bold size={22}>Comprendre avant de mémoriser</Txt>
          <Txt>Cette fiche illustre la structure d’un futur contenu : objectifs pédagogiques, notions essentielles et points de vigilance.</Txt>
          <Txt bold>01 · Poser les repères</Txt>
          <Txt color={c.muted}>Le contenu médical sera intégré après sélection des sources et validation éditoriale.</Txt>
          {objectives.filter((o) => o.subject === item.subject).map((o) => <RowLink key={o.id} title={o.title} subtitle={`${o.initialMinutes} min · ${state.progress[o.id]?.initialCompletedOn ? "Parcouru" : "Premier passage à terminer"}`} href={{ pathname: "/study", params: { objectiveId: o.id } }} />)}
          <Button title="Démarrer une séance" onPress={() => router.push({ pathname: "/study", params: { objectiveId: objectives.find((o) => o.subject === item.subject)!.id } })} />
        </>}
        {tab === "Approfondir" && <><Txt bold size={22}>Aller plus loin</Txt><Txt>Les explications détaillées, références et recommandations datées prendront place ici. Aucun contenu clinique n’est simulé.</Txt><Button title="Préparer ma méthode avec le coach" secondary onPress={() => router.push("/coach")} /></>}
        {tab === "Notions liées" && items.filter((x) => x.id !== item.id).slice(0, 2).map((x) => <RowLink key={x.id} title={x.subject} subtitle="Autre fiche à explorer" href={"/item?id=" + x.id} />)}
        {tab === "Mes annotations" && <><Txt bold>Votre espace pour faire des liens</Txt><TextInput multiline style={[s.input, { minHeight: 160, textAlignVertical: "top" }]} accessibilityLabel="Annotation personnelle" placeholder="Ce que je veux retenir…" value={note} onChangeText={(v) => { setNote(v); setSaved(false); }} /><Button title={saved ? "Annotation enregistrée" : "Enregistrer mon annotation"} onPress={() => void saveNote(id, note).then(() => setSaved(true)).catch(() => setSaved(false))} /><Txt size={12} color={c.muted}>Conservée sur cet appareil.</Txt></>}
      </Card>
    </Screen>
  );
}

function NephroticSheetView() {
  const { state, record } = usePreparation();
  const { validatedSheets, validateSheet, audioCompleted, audioProgress, saveAudioProgress, completeAudio } = useDemo();
  const [tab, setTab] = useState<"essential" | "deep">("essential");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [definitionId, setDefinitionId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(audioProgress[nephroticSheet.id] ?? 0);
  const validated = validatedSheets.includes(nephroticSheet.id);
  const source = medicalSources.find((x) => x.id === nephroticSheet.sourceVersionId)!;
  const audioText = `${nephroticSheet.title}. ${nephroticSheet.essentialPoints.join(" ")}`;
  const audioDuration = 180;
  useEffect(() => () => { void Speech.stop(); }, []);
  useEffect(() => {
    if (!playing || paused) return;
    const timer = setInterval(() => {
      setElapsed((value) => {
        const next = Math.min(audioDuration, value + 1);
        void saveAudioProgress(nephroticSheet.id, next);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, paused, saveAudioProgress]);
  const finishAudio = async () => {
    setElapsed(audioDuration);
    setPlaying(false);
    setPaused(false);
    await saveAudioProgress(nephroticSheet.id, audioDuration);
    await completeAudio(nephroticSheet.id, nephroticSheet.flashcardIds);
    for (const objective of medicalObjectives) {
      if (!state.progress[objective.id]?.initialCompletedOn)
        await record({ id: `audio-${nephroticSheet.id}-${objective.id}`, objectiveId: objective.id, kind: "initial", minutes: objective.id.endsWith("-1") ? 35 : 25, completed: true, source: "self" });
    }
    setMessage("Écoute terminée : premier passage validé, calendrier actualisé et cartes débloquées.");
  };
  const complete = async () => {
    if (busy || validated) return;
    setBusy(true);
    try {
      for (const objective of medicalObjectives) {
        if (!state.progress[objective.id]?.initialCompletedOn)
          await record({ id: `sheet-${nephroticSheet.id}-${objective.id}-${Date.now().toString(36)}`, objectiveId: objective.id, kind: "initial", minutes: objective.id.endsWith("-1") ? 35 : 25, completed: true, source: "self" });
      }
      await validateSheet(nephroticSheet.id, nephroticSheet.flashcardIds);
      setMessage("Premier passage validé : calendrier actualisé et cartes débloquées.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Validation impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={nephroticSheet.title} subtitle="Néphrologie · fiche originale à valider avant publication" back>
      <Card style={{ backgroundColor: c.peach }}>
        <Txt size={12} color={c.primary}>CONTENU MÉDICAL · VALIDATION ÉDITORIALE EN ATTENTE</Txt>
        <Txt>Cette fiche est un support pédagogique original. Sa source de travail est indiquée ci-dessous, mais une relecture médicale francophone reste nécessaire avant toute publication.</Txt>
        <Txt size={12} color={c.muted}>Source : {source.version} · statut : {source.status}</Txt>
      </Card>
      <View style={s.wrap}><Chip label="L’essentiel" selected={tab === "essential"} onPress={() => setTab("essential")} /><Chip label="Approfondir" selected={tab === "deep"} onPress={() => setTab("deep")} /></View>
      <Card>
        <Txt bold size={22}>{tab === "essential" ? "L’essentiel" : nephroticSheet.deepDive.title}</Txt>
        {tab === "essential" ? nephroticSheet.essentialPoints.map((point) => <Txt key={point}>• {point}</Txt>) : <><Txt>{nephroticSheet.deepDive.content}</Txt>{nephroticSheet.deepDive.recommandations.map((point) => <Txt key={point}>• {point}</Txt>)}<Txt bold>{nephroticSheet.pitfallsSheet.title}</Txt>{nephroticSheet.pitfallsSheet.traps.map((point) => <Txt key={point} color="#9A513C">• {point}</Txt>)}</>}
      </Card>
      <Card>
        <Txt bold>Notions importantes</Txt>
        <View style={s.wrap}>
          {nephroticSheet.definitions.map((definition) => <Chip key={definition.id} label={definition.term} selected={definition.id === definitionId} onPress={() => setDefinitionId(definition.id)} />)}
        </View>
        {(() => {
          const definition = nephroticSheet.definitions.find((item) => item.id === definitionId);
          return definition ? <><Txt bold>{definition.term}</Txt><Txt>{definition.short}</Txt>{definition.details && <Txt size={13} color={c.muted}>{definition.details}</Txt>}<Txt size={11} color={c.muted}>Source : {definition.source}</Txt></> : <Txt size={13} color={c.muted}>Touchez un terme pour afficher sa définition.</Txt>;
        })()}
      </Card>
      <Card>
        <Txt bold>Plan de la fiche</Txt>
        {nephroticSheet.sections.filter((section) => tab === "essential" ? ["Définition", "Diagnostic", "Étiologies", "Gravité et complications", "Traitement"].includes(section.title) : true).map((section) => <View key={section.id}><Txt bold size={15}>{section.title}</Txt><Txt size={13}>{section.content}</Txt>{section.content.toLowerCase().includes("attente") && <Txt size={11} color="#9A513C">Validation médicale requise avant publication.</Txt>}</View>)}
      </Card>
      <Card style={{ backgroundColor: c.lavender }}>
        <Txt bold size={19}>Écouter la fiche</Txt>
        <Txt size={13}>{nephroticSheet.podcast?.description} Lecture vocale locale avec expo-speech, sans génération audio payante.</Txt>
        <Progress value={(elapsed / audioDuration) * 100} />
        <Txt size={12} color={c.muted}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} / 3:00</Txt>
        <View style={s.wrap}>
          {!playing ? <Button title={paused ? "Reprendre" : elapsed > 0 && elapsed < audioDuration ? "Reprendre" : "Lire"} icon="play" onPress={() => {
            if (paused && Platform.OS !== "android") void Speech.resume();
            else {
              void Speech.stop();
              Speech.speak(audioText, { language: "fr-FR", onDone: () => void finishAudio() });
            }
            setPlaying(true);
            setPaused(false);
          }} /> : <Button title="Pause" icon="pause" onPress={() => {
            if (Platform.OS === "android") void Speech.stop();
            else void Speech.pause();
            setPaused(true);
            setPlaying(false);
          }} />}
          <Button title="Valider après écoute" secondary disabled={audioCompleted.includes(nephroticSheet.id) || elapsed < audioDuration} onPress={() => void finishAudio()} />
        </View>
        {audioCompleted.includes(nephroticSheet.id) && <Txt color={c.primary}>Écoute terminée et premier passage validé.</Txt>}
      </Card>
      <Card>
        <Txt bold>Objectifs de connaissance</Txt>
        {medicalObjectives.map((objective) => { const completed = !!state.progress[objective.id]?.initialCompletedOn; return <RowLink key={objective.id} title={objective.title} subtitle={`${objective.code} · ${completed ? "Premier passage validé" : "À valider"}`} icon={completed ? "checkmark-circle-outline" : "ellipse-outline"} />; })}
        <Button title={busy ? "Validation…" : validated ? "Premier passage déjà validé" : "Valider le premier passage"} disabled={busy || validated} onPress={() => void complete()} />
        {!!message && <Txt color={c.primary}>{message}</Txt>}
      </Card>
      {validated && <Card><Txt bold>Votre prochaine étape</Txt><Txt>Les cartes sont disponibles dans Mes Decks. Le mini-test reste facultatif.</Txt><Button title="Réviser les flashcards" onPress={() => router.push("/flashcards")} /><Button title="Faire le mini-test facultatif" secondary onPress={() => router.push("/mini-test")} /><Button title="Continuer le programme" secondary onPress={() => router.replace("/calendar")} /></Card>}
      <Card><Txt bold>Sources et prudence</Txt><Txt size={13}>Référence publique de travail : KDIGO 2021. Les seuils et conduites individuelles doivent être vérifiés par un professionnel avant diffusion.</Txt><Button title="Voir les flashcards débloquées" secondary onPress={() => router.push("/flashcards")} /></Card>
    </Screen>
  );
}
