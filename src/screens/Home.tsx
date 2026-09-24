import { View, Pressable } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Txt,
  Card,
  Button,
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
export default function Home() {
  const { profile, state, today, plan, summary } = usePreparation();
  const onboarded = state.onboarded;
  const tasks = plan.tasks.filter((t) => t.on === today);
  const next = tasks[0];
  const minutes = tasks.reduce((n, t) => n + t.minutes, 0);
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
          <Txt size={12}>{summary.todayMinutes} min effectuées</Txt>
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
                  ? "Aujourd’hui, " +
                    minutes +
                    " minutes planifiées pour avancer à votre rythme."
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
                              pathname: "/study",
                              params: {
                                objectiveId: next.objectiveId,
                                kind: next.kind,
                                minutes: String(next.minutes),
                              },
                            }
                          : "/calendar",
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
                  validation(s) aujourd’hui
                </Txt>
              </View>
            </View>
            <Section
              title="Votre programme du jour"
              action="Voir le planning"
              onPress={() => router.push("/calendar")}
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
              {summary.todaysEvents.map((e) => (
                <RowLink
                  key={e.id}
                  title={
                    objectives.find((o) => o.id === e.objectiveId)?.title ??
                    e.objectiveId
                  }
                  subtitle={
                    e.minutes +
                    " min effectuées · " +
                    (e.completed ? "Validée" : "Séance partielle")
                  }
                  icon="checkmark-circle-outline"
                  href={{
                    pathname: "/study",
                    params: { objectiveId: e.objectiveId },
                  }}
                />
              ))}
            </Card>
            <Section title="Apprendre autrement" />
            <View style={{ flexDirection: "row", gap: 14 }}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => router.push("/podcasts")}
              >
                <Card
                  style={{
                    backgroundColor: c.peach,
                    borderColor: c.peach,
                    flex: 1,
                  }}
                >
                  <Icon name="headset-outline" size={30} />
                  <Txt bold size={17}>
                    Une pause qui fait avancer
                  </Txt>
                  <Txt size={12} color={c.muted}>
                    Aperçu audio de démonstration.
                  </Txt>
                  <Txt bold size={13}>
                    Écouter un podcast →
                  </Txt>
                </Card>
              </Pressable>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => router.push("/errors")}
              >
                <Card
                  style={{
                    backgroundColor: c.lavender,
                    borderColor: c.lavender,
                    flex: 1,
                  }}
                >
                  <Icon name="layers-outline" size={30} />
                  <Txt bold size={17}>
                    L’erreur fait partie du chemin
                  </Txt>
                  <Txt size={12} color={c.muted}>
                    Aperçu du futur carnet d’erreurs.
                  </Txt>
                  <Txt bold size={13}>
                    Ouvrir mon carnet →
                  </Txt>
                </Card>
              </Pressable>
            </View>
          </>
        }
        side={
          <>
            <Card>
              <View style={s.between}>
                <Txt bold>Votre premier tour</Txt>
                <Icon name="flag-outline" color={c.primary} />
              </View>
              <View style={{ alignItems: "center", padding: 12 }}>
                <View
                  style={{
                    width: 146,
                    height: 146,
                    borderRadius: 80,
                    borderWidth: 11,
                    borderColor: c.mint,
                    borderTopColor: c.primary,
                    borderRightColor: c.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Txt size={35} bold>
                    {summary.percent}
                    <Txt size={19}> %</Txt>
                  </Txt>
                  <Txt size={11} color={c.muted}>
                    du chemin parcouru
                  </Txt>
                </View>
              </View>
              <Txt size={13} color={c.muted} style={{ textAlign: "center" }}>
                {summary.covered} objectifs parcourus sur {summary.total}
              </Txt>
              <View style={{ height: 1, backgroundColor: c.line }} />
              <View style={s.between}>
                <Txt size={13}>Objectif premier tour</Txt>
                <Txt size={12} bold>
                  {formatDay(plan.deadline)}
                </Txt>
              </View>
              <Txt size={11} color={c.muted}>
                {Math.max(0, daysBetween(today, plan.examOn))} jours avant le
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
              <Pressable onPress={() => router.push("/coach")}>
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
