import { passProgress } from "../domain/preparation/passes";
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
import { romanianLessons } from "../data/romanianLessons";
const labels = {
  "not-studied": "Non étudié",
  covered: "Parcouru",
  consolidating: "En consolidation",
  mastered: "Maîtrisé (évaluations QCM)",
  fragile: "À revoir",
};
export default function ProgressScreen() {
  const [tab, setTab] = useState("Vue d’ensemble");
  const { summary, state, today, plan } = usePreparation();
  const historicMax = Math.max(state.profile.targetPasses ?? 2, ...state.events.map(e=>e.pass ?? (e.kind === 'second' ? 2 : 1)));
  const visiblePasses = Array.from({length:historicMax}, (_,i)=>plan.passes[i] ?? {
    number:i+1, total:objectives.length,
    completed:objectives.filter(o=>passProgress(state.progress[o.id],i+1).completedOn).length,
    forecast:null,
  });
  const subjects = [...new Set(objectives.map((o) => o.subject))];
  const week = Array.from({ length: 7 }, (_, i) =>
    addDays(today, -weekday(today) + i),
  );
  const dailyMinutes = week.map((d) =>
    state.events.filter((e) => e.on === d).reduce((n, e) => n + e.minutes, 0),
  );
  const lessonParts = romanianLessons.reduce((count, lesson) => count + lesson.sections.length, 0);
  const reviewedLessons = romanianLessons.filter(lesson => lesson.coverage !== 'partial' && lesson.verification !== 'needs-review').length;
  return (
    <Screen
      title="Chaque pas compte"
      subtitle="Prenez du recul et regardez le chemin parcouru."
      back
    >
      <View style={s.wrap}>
        {["Vue d’ensemble", "Ouvrages", "Historique"].map(
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
          {visiblePasses.map(p => <Card key={p.number}><Txt bold>Tour {p.number}{p.number > (state.profile.targetPasses ?? 2) ? " · historique hors objectif actuel" : ""}</Txt><Progress value={p.total ? p.completed/p.total*100 : 0} /><Txt>{p.completed}/{p.total} chapitres · fin prévue : {formatDay(p.forecast)}</Txt></Card>)}
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
            <Section title="Votre avancement dans la Tematica" />
            <Txt>{summary.percent}% des chapitres parcourus</Txt>
            <Progress value={summary.percent} />
            <Txt size={12} color={c.muted}>
              {summary.mastered} chapitre(s) évalué(s) comme maîtrisés après
              exercices ; déclarer un passage terminé ne suffit pas.
            </Txt>
            <Txt>
              {summary.fragile.length} objectif(s) à revoir · {summary.second}{" "}
              deuxième(s) passage(s) terminé(s)
            </Txt>
          </Card>
          <Card>
            <Txt bold>Contenus pédagogiques Norya</Txt>
            <Txt>{romanianLessons.length}/{objectives.length} chapitres possèdent du contenu · {lessonParts} parties.</Txt>
            <Txt size={12} color={c.muted}>{reviewedLessons} chapitre entièrement vérifié à ce jour. Ce ratio de disponibilité des textes ne représente pas la couverture médicale complète du programme.</Txt>
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
              Durées estimées associées aux parties terminées. Norya ne suit pas
              le temps passé à l’écran.
            </Txt>
          </Card>
        </>
      )}
      {tab === "Ouvrages" && (
        <>
          {subjects.map((subject) => {
            const list = objectives.filter((o) => o.subject === subject),
              done = list.filter(
                (o) => passProgress(state.progress[o.id],1).completedOn,
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
                    href={{ pathname: "/chapter", params: { id: o.id } }}
                  />
                ))}
              </Card>
            );
          })}
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
                (e.kind === "pass" ? `Tour ${e.pass}` : e.kind === "initial"
                  ? "Premier tour"
                  : e.kind === "review"
                    ? "Rappel"
                    : "Deuxième tour")
              }
              icon="checkmark-circle-outline"
              href={{
                pathname: "/chapter",
                params: { id: e.objectiveId },
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
