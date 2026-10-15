import { View, TextInput } from "react-native";
import { Txt, Chip, s } from "./ui";
import type { PreparationProfile, Weekday } from "../domain/preparation/types";
import { WEEKDAYS } from "../domain/preparation/profile";
import { addDays, isDay } from "../domain/preparation/dates";
import { colors as c } from "../design/theme";
type Props = {
  profile: PreparationProfile;
  onChange: (p: PreparationProfile) => void;
};
export function DateFields({ profile: p, onChange }: Props) {
  const updateDate = (value: string, official: boolean) => {
    const examDate = official && value === p.examDate.official?.date
      ? p.examDate
      : { provisional: value };
    const active = examDate.official?.date ?? examDate.provisional;
    onChange({
      ...p,
      year: /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(0, 4) : p.year,
      examDate,
      firstPassTarget: isDay(active) ? addDays(active, -30) : p.firstPassTarget,
    });
  };
  return (
    <>
      <Txt size={13}>Date du concours · AAAA-MM-JJ</Txt>
      <TextInput
        accessibilityLabel="Date du concours"
        style={s.input}
        value={p.examDate.official?.date ?? p.examDate.provisional}
        onChangeText={(v) => updateDate(v, !!p.examDate.official)}
        autoCapitalize="none"
      />
      <Txt size={12} color={c.muted}>
        {p.examDate.official
          ? "Date officielle déclarée dans le profil. La modifier la rend provisoire."
          : "Date provisoire à confirmer. Norya ne propose pas de date officielle non vérifiée."}
      </Txt>
    </>
  );
}
export function AvailabilityFields({ profile: p, onChange }: Props) {
  return (
    <>
      <Txt bold>Charge quotidienne</Txt>
      <Txt size={13} color={c.muted}>
        Par défaut, Norya répartit automatiquement le travail restant sur les jours actifs, avec une limite indicative de 4 h par jour. Tes jours de repos sont respectés.
      </Txt>
      <View style={s.wrap}>
        <Chip
          label="Charge automatique"
          selected={!p.availabilityConfigured}
          onPress={() => onChange({ ...p, availabilityConfigured: false })}
        />
        <Chip
          label="Personnaliser mes disponibilités"
          selected={!!p.availabilityConfigured}
          onPress={() => onChange({ ...p, availabilityConfigured: true })}
        />
      </View>
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
              editable={!rest && !!p.availabilityConfigured}
              value={String(p.weeklyMinutes[day])}
              onChangeText={(v) => {
                const weeklyMinutes = [
                  ...p.weeklyMinutes,
                ] as PreparationProfile["weeklyMinutes"];
                weeklyMinutes[day] = /^\d*$/.test(v) ? Number(v) : NaN;
                onChange({ ...p, weeklyMinutes, availabilityConfigured: true });
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
        Une personnalisation affine la répartition, sans être nécessaire au calendrier. Les minutes déjà travaillées sont déduites et les validations restent acquises.
      </Txt>
    </>
  );
}
export function PassFields({ profile: p, onChange }: Props) {
  return <>
    <Txt bold size={22}>Combien de tours du programme souhaites-tu terminer avant le dernier mois ?</Txt>
    <Txt>Norya organise ton calendrier pour atteindre cet objectif tout en intégrant les révisions espacées.</Txt>
    <View style={s.wrap}>{Array.from({length:10},(_,i)=>i+1).map(n => <Chip key={n} label={`${n} tour${n > 1 ? 's' : ''}`} selected={(p.targetPasses ?? 2) === n} onPress={() => onChange({...p,targetPasses:n})} />)}</View>
    <Txt size={12} color={c.muted}>Vos validations et le calendrier existant sont conservés si vous changez cet objectif.</Txt>
  </>;
}
