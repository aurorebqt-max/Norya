import { useState } from "react";
import { router } from "expo-router";
import { Screen, Card, Txt, Button, Chip } from "../src/components/ui";
import { nephroticMiniTest } from "../src/data/medical";
import { colors as c } from "../src/design/theme";

export default function MiniTest() {
  const question = nephroticMiniTest[0];
  const [answer, setAnswer] = useState<string | null>(null);
  const choice = question.choices.find((item) => item.id === answer);
  return (
    <Screen title="Mini-test facultatif" subtitle="Syndrome néphrotique · une question de rappel" back>
      <Card>
        <Txt size={12} color={c.primary}>ENTRAÎNEMENT ILLUSTRATIF · SOURCE DANS LA FICHE</Txt>
        <Txt bold size={21}>{question.text}</Txt>
        {question.choices.map((item) => <Chip key={item.id} label={item.text} selected={answer === item.id} onPress={() => setAnswer(item.id)} />)}
        {choice && <Txt color={choice.isCorrect ? c.primary : "#9A513C"}>{choice.isCorrect ? "Bonne réponse. " : "À reprendre. "}{choice.explanation ?? question.generalExplanation}</Txt>}
        <Button title="Continuer le programme" onPress={() => router.replace("/calendar")} />
      </Card>
    </Screen>
  );
}
