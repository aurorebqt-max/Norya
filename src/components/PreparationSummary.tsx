import { router } from "expo-router";
import { Card, Txt, Button, Icon, Progress, RowLink } from "./ui";
import { colors as c } from "../design/theme";
import { formatDay, daysBetween } from "../domain/preparation/dates";
import { usePreparation } from "../state/PreparationProvider";
import { objectives, PROGRAM_LABEL } from "../data/program";
import { documentaryMap } from "../data/documentation";
import { useLearning } from "../state/LearningProvider";
import type {
  Plan,
  PreparationProfile,
  PlannedTask,
} from "../domain/preparation/types";
export function PlanStatus({
  plan,
  profile,
  editable = true,
}: {
  plan: Plan;
  profile: PreparationProfile;
  editable?: boolean;
}) {
  return (
    <Card style={{ backgroundColor: plan.feasible ? c.mint : c.peach }}>
      <Icon
        name={plan.feasible ? "flag-outline" : "time-outline"}
        color={c.primary}
      />
      <Txt bold>
        {plan.remainingPassMinutes === 0
          ? "Tes tours prévus sont parcourus"
          : plan.feasible
            ? "Un rythme compatible avec J−30"
            : "Ton objectif est ambitieux"}
      </Txt>
      <Txt size={13}>Date cible : {formatDay(plan.deadline)} · prévision : {formatDay(plan.passes.at(-1)?.forecast)}.</Txt>
      {plan.requiredMinutesPerAvailableDay !== null && plan.requiredMinutesPerAvailableDay > 0 &&
        <Txt size={13}>Charge moyenne estimée : environ {(plan.requiredMinutesPerAvailableDay / 60).toFixed(1)} h par jour actif pour terminer {profile.targetPasses ?? 2} tours avant J−30.</Txt>}
      {plan.feasible
        ? <Txt size={13}>Le programme tient compte des parties validées, des rappels et de tes jours de repos.</Txt>
        : <Txt size={13}>À ce rythme, les tours ne seront pas terminés avant J−30. Réduis le nombre de tours ou ajuste les disponibilités ; aucune progression acquise ne sera perdue.</Txt>}
      {!!plan.overdueReviews && <Txt size={12} color={c.muted}>{plan.overdueReviews} rappel(s) seront redistribués dans les prochaines séances.</Txt>}
      {editable && !plan.feasible && <Button title="Ajuster mon objectif" secondary onPress={() => router.push("/profile")} />}
    </Card>
  );
}
export function TaskRow({ task }: { task: PlannedTask }) {
  const objective = objectives.find((o) => o.id === task.objectiveId)!;
  const reading = useLearning().learning.reading[task.objectiveId];
  const lesson = documentaryMap.find((chapter) => chapter.id === task.objectiveId)?.lesson;
  return (
    <RowLink
      title={objective.title}
      subtitle={
        (task.kind === "pass" ? `Tour ${task.pass}` : task.kind === "initial"
          ? "Premier passage"
          : task.kind === "review"
            ? "Rappel actif"
            : "Deuxième tour") +
        " · " +
        task.minutes +
        " min" +
        (lesson
          ? ` · cours en ${lesson.sections.length} parties · continuer ${Math.min((reading?.section ?? 0) + 1, lesson.sections.length)}/${lesson.sections.length}`
          : "") +
        (task.phase === "final" ? " · Consolidation finale" : "")
      }
      icon={task.kind === "initial" ? "book-outline" : "refresh-outline"}
      color={task.kind === "initial" ? c.mint : c.lavender}
      href={{ pathname: "/chapter", params: { id: task.objectiveId } }}
    />
  );
}
export function FinalConsolidation() {
  const { plan, summary, state, today } = usePreparation();
  const left = plan.examOn ? daysBetween(today, plan.examOn) : Infinity;
  if (left > 30) return null;
  return (
    <Card>
      <Txt bold size={20}>
        {left >= 0
          ? "Dernière ligne droite · J−" + left
          : "Date du concours dépassée"}
      </Txt>
      <Txt>
        {summary.fragile.length} objectif(s) déclaré(s) à revoir ·{" "}
        {plan.overdueReviews} rappel(s) en retard.
      </Txt>
      <Txt size={13}>
        {summary.reviewed}/{summary.covered} objectifs parcourus ont reçu au
        moins un rappel actif.
      </Txt>
      <Progress
        value={summary.covered ? (summary.reviewed / summary.covered) * 100 : 0}
      />
      {summary.fragile.slice(0, 3).map((o) => (
        <RowLink
          key={o.id}
          title={o.title}
          subtitle={
            "Prochain rappel : " + formatDay(state.progress[o.id]?.nextReviewOn)
          }
          href={{ pathname: "/chapter", params: { id: o.id } }}
        />
      ))}
      <Txt size={13}>Priorité : QCM, examens blancs, flashcards, carnet d’erreurs et chapitres fragiles. Les tours restants sont conservés : avancez sur les chapitres prioritaires avec la moitié du temps réservée aux rappels essentiels.</Txt>
      <RowLink title="Entraînement du jour" href={{pathname:"/chapter",params:{id:"kum-08",tab:"qcm"}}} />
      <RowLink title="Flashcards" href="/flashcards" />
      <Txt size={12} color={c.muted}>
        {PROGRAM_LABEL}. Ce suivi repose sur vos actions, sans analyse
        automatique d’erreurs ni mesure clinique.
      </Txt>
    </Card>
  );
}
