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
export default function Calendar() {
  const { profile, plan, today, summary, state } = usePreparation();
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
    for (const t of plan.tasks) {
      const list = m.get(t.on) ?? [];
      list.push(t);
      m.set(t.on, list);
    }
    return m;
  }, [plan]);
  const tasks = tasksByDay.get(selected) ?? [];
  const events = state.events.filter((e) => e.on === selected);
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
                Disponibilité : {dailyCapacity(profile, selected)} min · Prévu
                restant : {tasks.reduce((n, t) => n + t.minutes, 0)} min
              </Txt>
              {state.onboarded &&
                tasks.map((t) => <TaskRow key={t.id} task={t} />)}
              {events.map((e) => (
                <RowLink
                  key={e.id}
                  title={
                    objectives.find((o) => o.id === e.objectiveId)?.title ??
                    e.objectiveId
                  }
                  subtitle={
                    e.minutes +
                    " min · " +
                    (e.completed ? "Validée" : "Partiellement terminée")
                  }
                  icon="checkmark-circle-outline"
                  href={{
                    pathname: "/study",
                    params: { objectiveId: e.objectiveId },
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
                  J−30 · au plus tard {formatDay(addDays(plan.examOn, -30))}
                </Txt>
              </View>
              <Txt bold>02 · Consolider les acquis</Txt>
              <Txt size={13} color={c.muted}>
                Deuxième tour : {summary.second}/{summary.total} objectifs. Il
                débute par objectif à partir de J+14 (J+7 si fragile), dans la
                capacité laissée par le premier tour.
              </Txt>
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
