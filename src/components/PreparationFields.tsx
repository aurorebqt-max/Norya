import { View, TextInput } from "react-native";
import { Txt, Chip, s } from "./ui";
import type { PreparationProfile, Weekday } from "../domain/preparation/types";
import { WEEKDAYS, changeExamYear } from "../domain/preparation/profile";
import { addDays, isDay } from "../domain/preparation/dates";
import { colors as c } from "../design/theme";
type Props = {
  profile: PreparationProfile;
  onChange: (p: PreparationProfile) => void;
};
export function DateFields({ profile: p, onChange }: Props) {
  const updateDate = (value: string, official: boolean) => {
    const examDate = official
      ? {
          ...p.examDate,
          official: { date: value, source: p.examDate.official?.source ?? "" },
        }
      : { ...p.examDate, provisional: value };
    const active = examDate.official?.date ?? examDate.provisional;
    onChange({
      ...p,
      examDate,
      firstPassTarget: isDay(active) ? addDays(active, -30) : p.firstPassTarget,
    });
  };
  const year = Number(new Date().getFullYear());
  return (
    <>
      <Txt>Votre année cible</Txt>
      <View style={s.wrap}>
        {Array.from(
          new Set([
            p.year,
            ...Array.from({ length: 6 }, (_, i) => String(year + i)),
          ]),
        ).map((y) => (
          <Chip
            key={y}
            label={y}
            selected={p.year === y}
            onPress={() => onChange(changeExamYear(p, y))}
          />
        ))}
      </View>
      <Txt size={13}>Date provisoire du concours · AAAA-MM-JJ</Txt>
      <TextInput
        accessibilityLabel="Date provisoire du concours"
        style={s.input}
        value={p.examDate.provisional}
        onChangeText={(v) => updateDate(v, false)}
        autoCapitalize="none"
      />
      <Txt size={12} color={c.muted}>
        Le 1er octobre est une hypothèse initiale à remplacer par votre date de
        travail. Aucune date officielle n’est préchargée.
      </Txt>
      <Chip
        label={
          p.examDate.official
            ? "Date officielle renseignée"
            : "J’ai une date officielle publiée"
        }
        selected={!!p.examDate.official}
        onPress={() =>
          onChange({
            ...p,
            examDate: p.examDate.official
              ? { provisional: p.examDate.provisional }
              : {
                  ...p.examDate,
                  official: { date: p.examDate.provisional, source: "" },
                },
            firstPassTarget: isDay(p.examDate.provisional)
              ? addDays(p.examDate.provisional, -30)
              : p.firstPassTarget,
          })
        }
      />
      {p.examDate.official && (
        <>
          <Txt size={13}>Date officielle saisie · AAAA-MM-JJ</Txt>
          <TextInput
            accessibilityLabel="Date officielle du concours"
            style={s.input}
            value={p.examDate.official.date}
            onChangeText={(v) => updateDate(v, true)}
          />
          <Txt size={13}>Lien de la publication officielle</Txt>
          <TextInput
            accessibilityLabel="Source de la date officielle"
            style={s.input}
            value={p.examDate.official.source}
            placeholder="https://…"
            autoCapitalize="none"
            onChangeText={(source) =>
              onChange({
                ...p,
                examDate: {
                  ...p.examDate,
                  official: { date: p.examDate.official!.date, source },
                },
              })
            }
          />
          <Txt size={12} color={c.muted}>
            Date déclarée par vous, non vérifiée automatiquement par Norya.
          </Txt>
        </>
      )}
    </>
  );
}
export function AvailabilityFields({ profile: p, onChange }: Props) {
  return (
    <>
      <Txt>Temps disponible par jour · en minutes</Txt>
      {WEEKDAYS.map((label, index) => {
        const day = index as Weekday;
        const rest = p.restDays.includes(day);
        return (
          <View key={label} style={s.between}>
            <Txt bold>{label}</Txt>
            <TextInput
              accessibilityLabel={"Minutes " + label}
              style={[s.input, { width: 95, opacity: rest ? 0.45 : 1 }]}
              keyboardType="number-pad"
              editable={!rest}
              value={String(p.weeklyMinutes[day])}
              onChangeText={(v) => {
                const weeklyMinutes = [
                  ...p.weeklyMinutes,
                ] as PreparationProfile["weeklyMinutes"];
                weeklyMinutes[day] = /^\d*$/.test(v) ? Number(v) : NaN;
                onChange({ ...p, weeklyMinutes });
              }}
            />
            <Chip
              label={rest ? "Repos" : "Jour actif"}
              selected={rest}
              onPress={() =>
                onChange({
                  ...p,
                  restDays: rest
                    ? p.restDays.filter((d) => d !== day)
                    : [...p.restDays, day],
                })
              }
            />
          </View>
        );
      })}
      <Txt size={12} color={c.muted}>
        Un jour de repos ne reçoit aucune séance. Les minutes déjà effectuées
        aujourd’hui sont déduites du temps disponible.
      </Txt>
      <Txt size={13}>Absences prévues · dates séparées par des virgules</Txt>
      <TextInput
        accessibilityLabel="Dates d’absence"
        style={s.input}
        value={p.constraints.unavailableDates.join(",")}
        placeholder="2027-02-10,2027-02-11"
        onChangeText={(v) =>
          onChange({
            ...p,
            constraints: {
              ...p.constraints,
              unavailableDates: v
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
            },
          })
        }
      />
    </>
  );
}
export function GoalFields({ profile: p, onChange }: Props) {
  return (
    <>
      <Txt size={13}>Début de préparation · AAAA-MM-JJ</Txt>
      <TextInput
        accessibilityLabel="Début de préparation"
        style={s.input}
        value={p.startsOn}
        onChangeText={(startsOn) => onChange({ ...p, startsOn })}
      />
      <Txt size={13}>Fin cible du premier tour · au plus tard J−30</Txt>
      <TextInput
        accessibilityLabel="Objectif de fin du premier tour"
        style={s.input}
        value={p.firstPassTarget}
        onChangeText={(firstPassTarget) => onChange({ ...p, firstPassTarget })}
      />
      <Txt size={13}>Fuseau de votre préparation</Txt>
      <TextInput
        accessibilityLabel="Fuseau de préparation"
        style={s.input}
        value={p.timeZone}
        onChangeText={(timeZone) => onChange({ ...p, timeZone })}
        autoCapitalize="none"
      />
      <Txt size={12} color={c.muted}>
        Le fuseau est conservé pendant vos déplacements. Le modifier change le
        jour courant, pas les dates de vos séances passées.
      </Txt>
      {[
        "Avancer avec régularité",
        "Consolider mes points fragiles",
        "Aborder les examens sereinement",
      ].map((goal) => (
        <Chip
          key={goal}
          label={goal}
          selected={p.goal === goal}
          onPress={() => onChange({ ...p, goal })}
        />
      ))}
    </>
  );
}
