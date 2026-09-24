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
        {plan.remainingInitialMinutes === 0
          ? "Votre premier tour est parcouru"
          : plan.feasible
            ? "Un cap à votre portée"
            : "Votre rythme mérite un ajustement"}
      </Txt>
      <Txt size={13}>
        Fin cible : {formatDay(plan.deadline)}. Fin prévisionnelle :{" "}
        {formatDay(plan.firstPassForecast)}.
      </Txt>
      {plan.feasible ? (
        <Txt size={13}>
          Le premier tour est prévu au moins 30 jours avant le concours, avec
          vos disponibilités actuelles.
        </Txt>
      ) : (
        <>
          <Txt size={13}>
            Premier tour restant : {plan.remainingInitialMinutes} min. Capacité
            restante avant la cible : {plan.availableBeforeTarget} min. Déficit
            : {plan.deficitMinutes} min.
          </Txt>
          <Txt size={13}>
            {plan.requiredMinutesPerAvailableDay === null
              ? "Aucun jour disponible avant la cible. Ajoutez des créneaux si vous le pouvez."
              : "Il faut au minimum " +
                plan.requiredMinutesPerAvailableDay +
                " min par jour encore disponible pour le premier tour, hors rappels supplémentaires."}{" "}
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
          title="Ajuster mes disponibilités"
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
        (task.kind === "initial"
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
          minutes: String(task.minutes),
        },
      }}
    />
  );
}
export function FinalConsolidation() {
  const { plan, summary, state, today } = usePreparation();
  const left = daysBetween(today, plan.examOn);
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
      <Txt size={12} color={c.muted}>
        {PROGRAM_LABEL}. Ce suivi repose sur vos actions, sans analyse
        automatique d’erreurs ni mesure clinique.
      </Txt>
    </Card>
  );
}
