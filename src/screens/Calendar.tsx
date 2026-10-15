import { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Card,
  Txt,
  Chip,
  Icon,
  Section,
  RowLink,
  Progress,
  Columns,
  Button,
  s,
} from "../components/ui";
import {
  TaskRow,
  PlanStatus,
  FinalConsolidation,
} from "../components/PreparationSummary";
import { colors as c } from "../design/theme";
import { usePreparation } from "../state/PreparationProvider";
import {
  addDays,
  daysBetween,
  formatDay,
  monthStart,
  moveMonth,
  weekday,
} from "../domain/preparation/dates";
import { dailyCapacity } from "../domain/preparation/planner";
import { objectives } from "../data/program";
import { useLearning } from "../state/LearningProvider";
import { groupDailyEvents, groupDailyTasks } from "../domain/preparation/dailyTasks";
export default function Calendar() {
  const { profile, plan, today, summary, state } = usePreparation();
  const { learning } = useLearning();
  const [selected, setSelected] = useState(today);
  const [week, setWeek] = useState(false);
  const [adapt, setAdapt] = useState(false);
  const month = monthStart(selected),
    nextMonth = moveMonth(month, 1);
  const start = week
    ? addDays(selected, -weekday(selected))
    : addDays(month, -weekday(month));
  const length = week
    ? 7
    : Math.ceil((daysBetween(month, nextMonth) + weekday(month)) / 7) * 7;
  const slots = Array.from({ length }, (_, i) => addDays(start, i));
  const tasksByDay = useMemo(() => {
    const m = new Map<string, typeof plan.tasks>();
    for (const t of groupDailyTasks(plan.tasks)) {
      const list = m.get(t.on) ?? [];
      list.push(t);
      m.set(t.on, list);
    }
    return m;
  }, [plan]);
  const tasks = tasksByDay.get(selected) ?? [];
  const events = groupDailyEvents(state.events.filter((e) => e.on === selected));
  const dueErrorCards = (learning.errorCards ?? []).filter(card => card.nextReviewOn <= selected);
  const shift = (n: number) =>
    setSelected(week ? addDays(selected, n * 7) : moveMonth(selected, n));
  return (
    <Screen
      title="Votre calendrier"
      subtitle="Un cap clair. Un rythme qui vous ressemble."
    >
      <View style={s.wrap}>
        <Chip label="Mois" selected={!week} onPress={() => setWeek(false)} />
        <Chip label="Semaine" selected={week} onPress={() => setWeek(true)} />
        <Chip
          label={
            summary.covered === summary.total
              ? "Premier tour parcouru"
              : "Premier tour en cours"
          }
          selected
        />
      </View>
      {!state.onboarded && (
        <Button
          title="Créer mon calendrier"
          onPress={() => router.push("/onboarding")}
        />
      )}
      {!!dueErrorCards.length && <Card>
        <Txt bold>Erreurs dues au {formatDay(selected)}</Txt>
        {dueErrorCards.map(card => <RowLink key={card.id} title={card.notion} subtitle={`Échéance ${formatDay(card.nextReviewOn)} · contenu en attente de vérification`} icon="alert-circle-outline" href="/errors" />)}
      </Card>}
      <Card>
        <Txt bold>Pour terminer tes tours à temps</Txt>
        <Txt>Voici ce qu’il faudrait travailler aujourd’hui : {tasks.reduce((sum, task) => sum + task.minutes, 0)} min recommandées sur {new Set(tasks.map(task => task.objectiveId)).size} chapitre(s). Le calcul se met à jour après chaque partie terminée, y compris depuis la bibliothèque.</Txt>
        {plan.requiredMinutesPerAvailableDay !== null && <Txt size={12} color={plan.feasible ? c.muted : c.primary}>
          Charge moyenne nécessaire : environ {(plan.requiredMinutesPerAvailableDay / 60).toFixed(1)} h par jour actif pour finir avant J−30.
        </Txt>}
      </Card>
      <Columns
        main={
          <>
            <Card>
              <View style={s.between}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    week ? "Semaine précédente" : "Mois précédent"
                  }
                  onPress={() => shift(-1)}
                >
                  <Icon name="chevron-back" />
                </Pressable>
                <Txt size={20} bold>
                  {week
                    ? formatDay(start) + " – " + formatDay(addDays(start, 6))
                    : formatDay(month, { day: undefined, month: "long" })}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    week ? "Semaine suivante" : "Mois suivant"
                  }
                  onPress={() => shift(1)}
                >
                  <Icon name="chevron-forward" />
                </Pressable>
              </View>
              <View style={{ flexDirection: "row" }}>
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <View
                    key={i}
                    style={{ width: "14.285%", alignItems: "center" }}
                  >
                    <Txt size={12} color={c.muted}>
                      {d}
                    </Txt>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {slots.map((day) => {
                  const hasTask = state.onboarded && tasksByDay.has(day);
                  const hasEvent = state.events.some((e) => e.on === day);
                  return (
                    <Pressable
                      key={day}
                      accessibilityRole="button"
                      accessibilityLabel={"Sélectionner le " + day}
                      accessibilityState={{ selected: day === selected }}
                      onPress={() => setSelected(day)}
                      style={{ width: "14.285%", height: 64, padding: 4 }}
                    >
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 13,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          backgroundColor:
                            day === selected
                              ? c.primary
                              : hasTask
                                ? c.mint
                                : "transparent",
                          opacity:
                            day.slice(0, 7) === month.slice(0, 7) || week
                              ? 1
                              : 0.45,
                        }}
                      >
                        <Txt
                          size={14}
                          bold={day === today}
                          color={day === selected ? "white" : c.ink}
                        >
                          {Number(day.slice(-2))}
                        </Txt>
                        {(hasTask || hasEvent) && (
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              backgroundColor:
                                day === selected
                                  ? c.lime
                                  : hasEvent
                                    ? c.primary
                                    : "#B5A6CC",
                            }}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <Txt size={12} color={c.muted}>
                ● Séances planifiées ou effectuées · jours de repos respectés
              </Txt>
              <Button
                title="Aujourd’hui"
                secondary
                onPress={() => setSelected(today)}
              />
            </Card>
            <Section title={formatDay(selected, { weekday: "long" })} />
            <Card>
              <Txt size={13} color={c.muted}>
                Charge recommandée : {tasks.reduce((n, t) => n + t.minutes, 0)} min · {new Set(tasks.map(t=>t.objectiveId)).size} chapitre(s). Les parties déjà terminées sont exclues.
              </Txt>
              {state.onboarded &&
                tasks.map((t) => <TaskRow key={t.id} task={t} />)}
              {events.map(({event:e,count}) => (
                <RowLink
                  key={`${e.objectiveId}:${e.pass}:${e.kind}`}
                  title={
                    objectives.find((o) => o.id === e.objectiveId)?.title ??
                    e.objectiveId
                  }
                  subtitle={`${count > 1 ? `${count} parties terminées` : e.completed ? "Partie terminée" : "Partie lue"} · tour ${e.pass ?? 1} · progression sauvegardée`}
                  icon="checkmark-circle-outline"
                  href={{
                    pathname: "/chapter",
                    params: { id: e.objectiveId },
                  }}
                />
              ))}
              {(!tasks.length || !state.onboarded) && !events.length && (
                <Txt color={c.muted}>
                  {selected < today
                    ? "Aucune activité enregistrée. Le travail restant est réparti dans les prochains créneaux."
                    : dailyCapacity(profile, selected) === 0
                      ? "Un peu de repos fait aussi avancer."
                      : "Aucune séance à cette date."}
                </Txt>
              )}
            </Card>
          </>
        }
        side={
          <>
            <Card>
              <Txt bold size={19}>
                Votre feuille de route
              </Txt>
              <Txt bold>01 · Explorer le programme</Txt>
              <Txt size={13} color={c.muted}>
                Premier tour · {summary.covered} / {summary.total} objectifs
              </Txt>
              <Progress value={summary.percent} />
              <Txt size={13}>
                Prévision : {formatDay(plan.firstPassForecast)}
              </Txt>
              <View
                style={{
                  backgroundColor: c.lime,
                  padding: 15,
                  borderRadius: 13,
                }}
              >
                <Txt bold size={13}>
                  J−30 · au plus tard {formatDay(plan.examOn ? addDays(plan.examOn, -30) : null)}
                </Txt>
              </View>
              {plan.passes.map(p=><View key={p.number} style={{gap:8}}><Txt bold>Tour {p.number} · {p.completed}/{p.total}</Txt><Progress value={p.total ? p.completed/p.total*100 : 0}/><Txt size={13}>Fin prévue : {formatDay(p.forecast)}</Txt></View>)}
              <Txt bold>03 · Concours · {formatDay(plan.examOn)}</Txt>
              <Txt size={11} color={c.muted}>
                {profile.examDate.official
                  ? "Date déclarée officielle dans votre profil."
                  : "Date provisoire, à confirmer."}
              </Txt>
            </Card>
            <PlanStatus plan={plan} profile={profile} />
            <FinalConsolidation />
            <Card>
              <Icon name="git-branch-outline" color={c.primary} />
              <Txt bold>La vie bouge. Votre planning aussi.</Txt>
              <Txt size={13} color={c.muted}>
                Chaque validation ou changement de disponibilité recalcule les
                prochaines séances. Aucun jour ne dépasse le temps que vous avez
                défini.
              </Txt>
              <Button
                title="Comprendre le recalcul"
                secondary
                onPress={() => setAdapt(!adapt)}
              />
              {adapt && (
                <Txt size={13}>
                  Après une absence, les objectifs non terminés et les rappels
                  en attente sont redistribués à partir d’aujourd’hui. Les
                  séances passées restent dans votre historique. Les rappels
                  futurs sont des prévisions, ajustées après chaque résultat.
                </Txt>
              )}
              <Button
                title="Modifier mes disponibilités"
                secondary
                onPress={() => router.push("/profile")}
              />
            </Card>
          </>
        }
      />
    </Screen>
  );
}
