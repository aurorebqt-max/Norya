import { View, Pressable } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Txt,
  Card,
  Button,
  Progress,
  Icon,
  Section,
  RowLink,
  Columns,
  s,
} from "../components/ui";
import { colors as c } from "../design/theme";
import { PROGRAM_LABEL, objectives } from "../data/program";
import { formatDay, daysBetween } from "../domain/preparation/dates";
import {
  TaskRow,
  PlanStatus,
  FinalConsolidation,
} from "../components/PreparationSummary";
import { usePreparation } from "../state/PreparationProvider";
import { completionPercent } from "../domain/preparation/progress";
import { useLearning } from "../state/LearningProvider";
import { groupDailyEvents, groupDailyTasks } from "../domain/preparation/dailyTasks";
export default function Home() {
  const { profile, state, today, plan, summary } = usePreparation();
  const { learning } = useLearning();
  const onboarded = state.onboarded;
  const tasks = groupDailyTasks(plan.tasks.filter((t) => t.on === today));
  const todaysEvents = groupDailyEvents(summary.todaysEvents);
  const next = tasks[0];
  const activePass = plan.passes.find(p=>p.completed < p.total) ?? plan.passes.at(-1)!;
  const activePassPercent = completionPercent(activePass.completed, activePass.total);
  const minutes = tasks.reduce((n, t) => n + t.minutes, 0);
  const dueErrors = (learning.errorCards ?? []).filter(card => card.nextReviewOn <= today);
  return (
    <Screen
      title={
        profile.name ? "Bonjour " + profile.name + "," : "Bienvenue chez Norya,"
      }
      subtitle="Un pas de plus vers le médecin que vous voulez devenir."
    >
      <View style={s.between}>
        <Txt size={12} color={c.muted}>
          {formatDay(today, { weekday: "long" }).toUpperCase()}
        </Txt>
        <View style={s.row}>
          <Icon name="flame-outline" color="#BC8652" size={18} />
          <Txt size={12}>{summary.todayMinutes} min estimées enregistrées</Txt>
        </View>
      </View>
      <Columns
        main={
          <>
            <View
              style={{
                backgroundColor: c.primary,
                borderRadius: 25,
                padding: 28,
                overflow: "hidden",
                gap: 18,
              }}
            >
              <View style={s.between}>
                <View
                  style={{
                    backgroundColor: "#ffffff20",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Txt size={11} color="#E6EDB8" bold>
                    VOTRE CAP DU JOUR
                  </Txt>
                </View>
                <Icon name="sunny-outline" color={c.lime} size={32} />
              </View>
              <Txt size={30} bold color="white" style={{ letterSpacing: -0.6 }}>
                Les petits progrès font les grandes réussites.
              </Txt>
              <Txt color="#D8E9DF" size={14}>
                {onboarded
                  ? "Pour terminer tes tours à temps, voici ce qu’il faudrait travailler aujourd’hui : " +
                    minutes +
                    " min recommandées."
                  : "Votre prochain pas : créer votre profil pour obtenir votre calendrier."}
              </Txt>
              <View style={[s.between, { marginTop: 6, flexWrap: "wrap" }]}>
                <Pressable
                  onPress={() =>
                    router.push(
                      !onboarded
                        ? "/onboarding"
                        : next
                          ? {
                              pathname: "/chapter",
                              params: { id: next.objectiveId },
                            }
                          : "/schedule",
                    )
                  }
                  style={[s.button, { backgroundColor: c.lime }]}
                >
                  <Txt bold color={c.ink}>
                    {!onboarded
                      ? "Personnaliser mon parcours"
                      : next
                        ? "Commencer ma séance"
                        : "Voir les prochaines séances"}
                  </Txt>
                  <Icon name="arrow-forward" size={18} />
                </Pressable>
                <Txt size={12} color="#D8E9DF">
                  {summary.todaysEvents.filter((e) => e.completed).length}{" "}
                      partie(s) terminée(s) aujourd’hui
                </Txt>
              </View>
            </View>
            <Section
              title="Votre programme du jour"
              action="Voir le planning"
              onPress={() => router.push("/schedule")}
            />
            <Card style={{ paddingVertical: 5 }}>
              {onboarded ? (
                tasks.length ? (
                  tasks.map((task) => <TaskRow key={task.id} task={task} />)
                ) : (
                  <Txt color={c.muted}>
                    Votre journée est libre. Vos prochaines séances sont dans le
                    calendrier.
                  </Txt>
                )
              ) : (
                <Txt color={c.muted}>
                  Votre programme apparaîtra après la configuration de votre
                  parcours.
                </Txt>
              )}
              {todaysEvents.map(({event:e,count}) => (
                <RowLink
                  key={`${e.objectiveId}:${e.pass}:${e.kind}`}
                  title={
                    objectives.find((o) => o.id === e.objectiveId)?.title ??
                    e.objectiveId
                  }
                  subtitle={`${count > 1 ? `${count} parties terminées` : "Partie terminée"} · tour ${e.pass ?? 1} · progression sauvegardée`}
                  icon="checkmark-circle-outline"
                  href={{
                    pathname: "/chapter",
                    params: { id: e.objectiveId },
                  }}
                />
              ))}
            </Card>
            <RowLink title="Entraînement Rezidențiat" subtitle="Questions originales Norya · annales vérifiées indisponibles" href="/quiz" />
            <RowLink title="Mes flashcards du jour" subtitle="Rappels espacés du deck personnel" href="/flashcards" />
            <Section title="Réviser" />
            <RowLink title="Mes erreurs" subtitle={`${dueErrors.length} à revoir · historique local`} icon="layers-outline" href="/errors" />
            <RowLink title="Flashcards" subtitle="Rappels prévus dans le deck personnel" icon="albums-outline" href="/flashcards" />
          </>
        }
        side={
          <>
            <Card>
              <View style={s.between}>
                <Txt bold>Tour {activePass.number}</Txt>
                <Icon name="flag-outline" color={c.primary} />
              </View>
              <View style={{ gap: 10, paddingVertical: 12 }}>
                <View style={s.between}>
                  <Txt size={35} bold>{activePassPercent}<Txt size={19}> %</Txt></Txt>
                  <Txt size={11} color={c.muted}>du tour parcouru</Txt>
                </View>
                <Progress value={activePassPercent} color={c.primary} />
              </View>
              <Txt size={13} color={c.muted} style={{ textAlign: "center" }}>
                {activePass.completed} chapitres sur {activePass.total}
              </Txt>
              <View style={{ height: 1, backgroundColor: c.line }} />
              <View style={s.between}>
                <Txt size={13}>Fin prévue du tour</Txt>
                <Txt size={12} bold>
                  {formatDay(activePass.forecast)}
                </Txt>
              </View>
              <Txt size={11} color={c.muted}>
                {plan.examOn ? Math.max(0, daysBetween(today, plan.examOn)) : "—"} jours avant le
                concours ·{" "}
                {profile.examDate.official
                  ? "date déclarée officielle"
                  : "date provisoire"}
                .
              </Txt>
              <Button
                title="Voir ma progression"
                secondary
                onPress={() => router.push("/progress")}
              />
            </Card>
            {onboarded && <PlanStatus plan={plan} profile={profile} />}
            <FinalConsolidation />
            <Card style={{ backgroundColor: "#EEF3E9" }}>
              <View style={s.row}>
                <Icon name="sparkles" color={c.primary} />
                <Txt bold>Un conseil de Norya</Txt>
              </View>
              <Txt size={14}>
                La régularité compte plus que la durée. Gardez un petit moment
                pour un rappel actif de vos objectifs déjà parcourus.
              </Txt>
              <Pressable onPress={() => router.push("/mentor")}>
                <Txt color={c.primary} bold size={13}>
                  Échanger avec mon coach →
                </Txt>
              </Pressable>
            </Card>
            {!onboarded && (
              <Card>
                <Txt bold>Un parcours qui vous ressemble</Txt>
                <Txt size={13} color={c.muted}>
                  Renseignez votre profil et vos disponibilités.
                </Txt>
                <Button
                  title="Personnaliser mon parcours"
                  secondary
                  onPress={() => router.push("/onboarding")}
                />
              </Card>
            )}
            <Txt size={11} color={c.muted}>
              {PROGRAM_LABEL}. Progression issue de vos actions, sans mesure de
              maîtrise médicale.
            </Txt>
          </>
        }
      />
    </Screen>
  );
}
