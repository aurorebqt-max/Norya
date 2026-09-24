import { useState } from "react";
import { View } from "react-native";
import {
  Screen,
  Card,
  Txt,
  Chip,
  Progress,
  RowLink,
  Section,
  s,
} from "../components/ui";
import { FinalConsolidation } from "../components/PreparationSummary";
import { objectives, PROGRAM_LABEL } from "../data/program";
import { usePreparation } from "../state/PreparationProvider";
import { colors as c } from "../design/theme";
import { addDays, weekday, formatDay } from "../domain/preparation/dates";
import { emptyProgress } from "../domain/preparation/progress";
const labels = {
  "not-studied": "Non étudié",
  covered: "Parcouru",
  consolidating: "En consolidation",
  mastered: "Maîtrisé (évaluations QCM)",
  fragile: "À revoir",
};
export default function ProgressScreen() {
  const [tab, setTab] = useState("Vue d’ensemble");
  const { summary, state, profile, today } = usePreparation();
  const subjects = [...new Set(objectives.map((o) => o.subject))];
  const rankProgress = (rank: "A" | "B") => {
    const list = objectives.filter((o) => o.rank === rank);
    return Math.round(
      (list.filter((o) => state.progress[o.id]?.initialCompletedOn).length /
        list.length) *
        100,
    );
  };
  const week = Array.from({ length: 7 }, (_, i) =>
    addDays(today, -weekday(today) + i),
  );
  const dailyMinutes = week.map((d) =>
    state.events.filter((e) => e.on === d).reduce((n, e) => n + e.minutes, 0),
  );
  return (
    <Screen
      title="Chaque pas compte"
      subtitle="Prenez du recul et regardez le chemin parcouru."
      back
    >
      <View style={s.wrap}>
        {["Vue d’ensemble", "Matières", "Spécialités", "Historique"].map(
          (x) => (
            <Chip
              key={x}
              label={x}
              selected={tab === x}
              onPress={() => setTab(x)}
            />
          ),
        )}
      </View>
      <Txt size={12} color={c.muted}>
        {PROGRAM_LABEL.toUpperCase()} · PROGRESSION LOCALE RÉELLE
      </Txt>
      {tab === "Vue d’ensemble" && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {[
              {
                title: "Premier tour",
                value: summary.percent + " %",
                detail:
                  summary.covered +
                  " / " +
                  summary.total +
                  " objectifs parcourus",
              },
              {
                title: "Consolidation",
                value: summary.reviewed + " / " + summary.covered,
                detail: "Objectifs avec un rappel actif terminé",
              },
              {
                title: "Travail du jour",
                value: summary.todayMinutes + " min",
                detail:
                  summary.todaysEvents.length + " séance(s) enregistrée(s)",
              },
            ].map((x) => (
              <Card key={x.title} style={{ flexBasis: 210, flexGrow: 1 }}>
                <Txt color={c.muted} size={13}>
                  {x.title}
                </Txt>
                <Txt bold size={35}>
                  {x.value}
                </Txt>
                <Txt size={12} color={c.muted}>
                  {x.detail}
                </Txt>
              </Card>
            ))}
          </View>
          <Card>
            <Section title="Des bases qui se renforcent" />
            <Txt>Rang A · {rankProgress("A")}% parcourus</Txt>
            <Progress value={rankProgress("A")} />
            <Txt>Rang B · {rankProgress("B")}% parcourus</Txt>
            <Progress value={rankProgress("B")} color="#B5A6CC" />
            <Txt size={12} color={c.muted}>
              Rangs du jeu de démonstration, sans pondération officielle.{" "}
              {summary.mastered} objectif(s) maîtrisé(s) selon évaluations QCM :
              les autoévaluations seules ne suffisent pas.
            </Txt>
            <Txt>
              {summary.fragile.length} objectif(s) à revoir · {summary.second}{" "}
              deuxième(s) passage(s) terminé(s)
            </Txt>
          </Card>
          <FinalConsolidation />
          <Card>
            <Txt bold size={20}>
              Votre régularité cette semaine
            </Txt>
            <View
              style={{
                height: 165,
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 12,
                justifyContent: "space-around",
              }}
            >
              {dailyMinutes.map((v, i) => (
                <View key={i} style={{ alignItems: "center", gap: 7, flex: 1 }}>
                  <Txt size={11}>{v}</Txt>
                  <View
                    style={{
                      height: Math.max(
                        4,
                        (v / Math.max(1, ...dailyMinutes)) * 100,
                      ),
                      width: "70%",
                      backgroundColor: week[i] === today ? c.primary : c.mint,
                      borderRadius: 7,
                    }}
                  />
                  <Txt size={12} color={c.muted}>
                    {["L", "M", "M", "J", "V", "S", "D"][i]}
                  </Txt>
                </View>
              ))}
            </View>
            <Txt size={12} color={c.muted}>
              Minutes réellement enregistrées. Une journée sans saisie reste à
              zéro.
            </Txt>
          </Card>
        </>
      )}
      {(tab === "Matières" || tab === "Spécialités") && (
        <>
          {(tab === "Spécialités"
            ? subjects.filter((x) => profile.specialties.includes(x))
            : subjects
          ).map((subject) => {
            const list = objectives.filter((o) => o.subject === subject),
              done = list.filter(
                (o) => state.progress[o.id]?.initialCompletedOn,
              ).length;
            return (
              <Card key={subject}>
                <Txt bold size={20}>
                  {subject}
                </Txt>
                <Progress value={(done / list.length) * 100} />
                <Txt size={12}>
                  {done}/{list.length} parcourus
                </Txt>
                {list.map((o) => (
                  <RowLink
                    key={o.id}
                    title={o.title}
                    subtitle={
                      labels[(state.progress[o.id] ?? emptyProgress()).status]
                    }
                    href={{ pathname: "/study", params: { objectiveId: o.id } }}
                  />
                ))}
              </Card>
            );
          })}
          {tab === "Spécialités" &&
            !subjects.some((x) => profile.specialties.includes(x)) && (
              <Card>
                <Txt>
                  Aucune spécialité du programme sélectionnée. Toutes les
                  matières restent accessibles.
                </Txt>
              </Card>
            )}
        </>
      )}
      {tab === "Historique" && (
        <Card>
          {[...state.events].reverse().map((e) => (
            <RowLink
              key={e.id}
              title={
                objectives.find((o) => o.id === e.objectiveId)?.title ??
                e.objectiveId
              }
              subtitle={
                formatDay(e.on) +
                " · " +
                e.minutes +
                " min · " +
                (e.completed ? "Passage terminé" : "Partiel") +
                " · " +
                (e.kind === "initial"
                  ? "Premier tour"
                  : e.kind === "review"
                    ? "Rappel"
                    : "Deuxième tour")
              }
              icon="checkmark-circle-outline"
              href={{
                pathname: "/study",
                params: { objectiveId: e.objectiveId },
              }}
            />
          ))}
          {!state.events.length && (
            <Txt color={c.muted}>
              Votre historique commencera avec votre première séance
              enregistrée.
            </Txt>
          )}
        </Card>
      )}
    </Screen>
  );
}
