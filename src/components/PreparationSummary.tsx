import { router } from "expo-router";
import { Card, Txt, Button, Icon, Progress, RowLink } from "./ui";
import { colors as c } from "../design/theme";
import { formatDay, daysBetween } from "../domain/preparation/dates";
import { usePreparation } from "../state/PreparationProvider";
import { objectives, PROGRAM_LABEL } from "../data/program";
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
          ? "Vos tours sont parcourus"
          : plan.feasible
            ? "Un cap à votre portée"
            : "Votre rythme mérite un ajustement"}
      </Txt>
      <Txt size={13}>
        Fin cible : {formatDay(plan.deadline)}. Fin prévisionnelle :{" "}
        {formatDay(plan.passes.at(-1)?.forecast)}.
      </Txt>
      {plan.feasible ? (
        <Txt size={13}>
          Les tours sont prévus au moins 30 jours avant le concours, avec
          vos disponibilités actuelles.
        </Txt>
      ) : (
        <>
          <Txt size={13}>
            Travail des tours restant : {plan.remainingPassMinutes} min. Capacité
            restante avant la cible : {plan.availableBeforeTarget} min. Déficit
            : {plan.deficitMinutes} min.
          </Txt>
          <Txt size={13}>
            {plan.requiredMinutesPerAvailableDay === null
              ? "Aucun jour disponible avant la cible. Ajoutez des créneaux si vous le pouvez."
              : `Avec tes disponibilités actuelles, terminer ${profile.targetPasses ?? 2} tours avant J−30 nécessiterait environ ${(plan.requiredMinutesPerAvailableDay / 60).toFixed(1)} heures par jour disponible. Réduis le nombre de tours, augmente les heures disponibles ou ajuste la cible (au plus tard J−30).`}{" "}
            Vous pouvez continuer à votre rythme.
          </Txt>
        </>
      )}
      <Txt size={12} color={c.muted}>
        Concours : {formatDay(plan.examOn)} ·{" "}
        {profile.examDate.official
          ? "date déclarée officielle, source renseignée"
          : "date provisoire à confirmer"}
        .{" "}
        {plan.overdueReviews > 0
          ? plan.overdueReviews +
            " rappel(s) en retard, redistribué(s) dans les créneaux disponibles."
          : ""}
      </Txt>
      {editable && !plan.feasible && (
        <Button
          title="Ajuster mes tours et disponibilités"
          secondary
          onPress={() => router.push("/profile")}
        />
      )}
    </Card>
  );
}
export function TaskRow({ task }: { task: PlannedTask }) {
  const objective = objectives.find((o) => o.id === task.objectiveId)!;
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
        (task.phase === "final" ? " · Consolidation finale" : "")
      }
      icon={task.kind === "initial" ? "book-outline" : "refresh-outline"}
      color={task.kind === "initial" ? c.mint : c.lavender}
      href={{
        pathname: "/study",
        params: {
          objectiveId: task.objectiveId,
          kind: task.kind,
          pass: String(task.pass ?? 1),
          minutes: String(task.minutes),
        },
      }}
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
          href={{
            pathname: "/study",
            params: { objectiveId: o.id, kind: "review" },
          }}
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
