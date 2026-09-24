import { useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Screen, Card, Txt, Button, Chip, Progress } from "../components/ui";
import { trainingDossier, trainingExam, trainingQuestions } from "../data/training";
import { useDemo } from "../state/DemoProvider";
import { colors as c } from "../design/theme";

export default function Training() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { recordPractice, practiceErrors } = useDemo();
  const questions = useMemo(() => mode === "dossier" ? trainingDossier.questions : mode === "examen" ? trainingExam.questions : mode === "lca" ? [trainingQuestions[1]] : [trainingQuestions[0]], [mode]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const question = questions[index];
  const title = mode === "dossier" ? trainingDossier.title : mode === "examen" ? trainingExam.title : mode === "lca" ? "Lecture critique d’article" : "Question isolée";
  const choose = async (id: string) => {
    if (answer) return;
    const selected = question.choices.find((choice) => choice.id === id)!;
    setAnswer(id);
    if (selected.isCorrect) setScore((value) => value + 1);
    await recordPractice(question.id, question.objectiveId, selected.isCorrect);
  };
  return (
    <Screen title={title} subtitle="Entraînement original · aucune annale officielle reproduite" back>
      <Card style={{ backgroundColor: c.mint }}>
        <Txt size={12} color={c.primary}>OBJECTIF {question.objectiveId} · RANG ÉDITORIAL {question.rank}</Txt>
        <Txt>{mode === "dossier" ? trainingDossier.context : "Contenu pédagogique à valider médicalement avant publication."}</Txt>
        <Progress value={(index / questions.length) * 100} />
        <Txt size={12} color={c.muted}>Question {index + 1}/{questions.length} · erreurs suivies : {practiceErrors.length}</Txt>
      </Card>
      <Card>
        <Txt bold size={21}>{question.text}</Txt>
        {question.choices.map((choice) => <Chip key={choice.id} label={choice.text} selected={answer === choice.id} onPress={() => void choose(choice.id)} />)}
        {answer && <Txt color={question.choices.find((choice) => choice.id === answer)?.isCorrect ? c.primary : "#9A513C"}>{question.choices.find((choice) => choice.id === answer)?.explanation ?? question.generalExplanation}</Txt>}
        {answer && (index + 1 < questions.length ? <Button title="Question suivante" onPress={() => { setIndex((value) => value + 1); setAnswer(null); }} /> : <><Txt bold>Résultat : {score}/{questions.length}</Txt><Button title="Retour aux entraînements" onPress={() => router.replace("/practice")} /></>)}
      </Card>
    </Screen>
  );
}
