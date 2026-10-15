import { router } from "expo-router";
import { Screen, Card, Txt, Button, RowLink } from "../components/ui";
import { questionBank } from "../domain/learning/quiz";
import { examRules } from "../data/examRules";
import { historicalRezidentiatCutoffs } from "../data/historicalResults";

export default function Practice() {
  return (
    <Screen title="S’entraîner" subtitle="Questions Norya, résultats sauvegardés et erreurs révisables.">
      <Card>
        <Txt size={12}>QCM ORIGINAUX NORYA</Txt>
        <Txt bold size={24}>Une question à la fois, sans chronomètre.</Txt>
        <Txt>{questionBank.length} questions originales disponibles. Elles sont distinctes des annales officielles ; leurs contenus attendent encore une relecture médicale.</Txt>
        <Button title="Commencer une séance" icon="arrow-forward" onPress={() => router.push("/quiz")} />
      </Card>
      <Card>
        <Txt bold size={20}>Résultats historiques et spécialités</Txt>
        {historicalRezidentiatCutoffs.length
          ? <Txt>Des seuils historiques sourcés sont disponibles. Ils décrivent une année passée et ne prédisent pas un rang futur.</Txt>
          : <Txt>Aucune donnée officielle de classement par score, spécialité et centre n’est actuellement importée et vérifiée. Norya n’affiche donc ni rang estimé ni spécialité prétendument accessible.</Txt>}
      </Card>
      <Card>
        <Txt bold size={20}>Examen blanc</Txt>
        <Txt>Pas encore disponible : le format de référence exige {examRules.questions} questions vérifiées (dont {examRules.singleCount} simples et {examRules.multipleCount} multiples), ainsi qu’un corrigé et des droits de réutilisation contrôlés. Les {questionBank.length} QCM Norya ne suffisent pas à simuler une épreuve complète.</Txt>
        <Txt size={12}>Le document ministériel consulté concerne la session 2026 ; son statut d’adoption définitive n’est pas établi par le PDF seul. Le barème de l’entraînement reste provisoire.</Txt>
      </Card>
      <Card>
        <RowLink title="Mes erreurs" subtitle="Questions ratées, historique et échéances locales." icon="layers-outline" href="/errors" />
        <RowLink title="Mes flashcards" subtitle="Rappels espacés séparés de la validation de lecture." icon="albums-outline" href="/flashcards" />
        <RowLink title="Ma progression" subtitle="Tours, validations et historique du calendrier." icon="stats-chart-outline" href="/progress" />
      </Card>
    </Screen>
  );
}
