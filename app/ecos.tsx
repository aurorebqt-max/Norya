import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Screen, Card, Txt, Button, Chip, Progress } from "../src/components/ui";
import { ecosStations } from "../src/data/training";
import { colors as c } from "../src/design/theme";

export default function Ecos() {
  const station = ecosStations[0];
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(station.durationMinutes * 60);
  const [scores, setScores] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!started || seconds <= 0) return;
    const timer = setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [started, seconds]);
  return (
    <Screen title="Stations ECOS" subtitle="Mode écrit · architecture prête pour un futur oral" back>
      <Card style={{ backgroundColor: c.lavender }}>
        <Txt size={12} color={c.primary}>STATION ORIGINALE · VALIDATION MÉDICALE À FINALISER</Txt>
        <Txt bold size={22}>{station.title}</Txt>
        <Txt>{station.startingSituation}</Txt>
        <Txt bold>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</Txt>
        <Progress value={(seconds / (station.durationMinutes * 60)) * 100} />
        <Button title={started ? "Station en cours" : "Démarrer la station"} disabled={started} onPress={() => setStarted(true)} />
      </Card>
      <Card>
        <Txt bold>Consignes</Txt>
        {station.candidateInstructions.map((instruction) => <Txt key={instruction}>• {instruction}</Txt>)}
        <Txt bold>Grille de correction</Txt>
        {station.scoringGrid.map((criterion) => <Card key={criterion.criterion} style={{ padding: 14 }}><Txt bold>{criterion.criterion} · {criterion.points} points</Txt><Txt size={13}>{criterion.explanation}</Txt><Chip label={scores[criterion.criterion] ? "Validé" : "À autoévaluer"} selected={!!scores[criterion.criterion]} onPress={() => setScores((value) => ({ ...value, [criterion.criterion]: !value[criterion.criterion] }))} /></Card>)}
        <Txt size={12} color={c.muted}>Le futur mode oral pourra remplacer l’autoévaluation par un enregistrement et une correction dédiée; aucun enregistrement n’est activé.</Txt>
        <Button title="Retour aux entraînements" secondary onPress={() => router.replace("/practice")} />
      </Card>
    </Screen>
  );
}
