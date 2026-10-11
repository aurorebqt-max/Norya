import { useMemo, useState } from "react";
import { View, TextInput } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Card,
  Txt,
  Icon,
  Button,
  Chip,
  Progress,
  s,
} from "../components/ui";
import {
  PassFields,
  DateFields,
  AvailabilityFields,
  GoalFields,
} from "../components/PreparationFields";
import { PlanStatus } from "../components/PreparationSummary";
import { usePreparation } from "../state/PreparationProvider";
import { colors as c } from "../design/theme";
import { validateProfile, weeklyCapacity } from "../domain/preparation/profile";
import { todayInZone } from "../domain/preparation/dates";
import { buildPlan } from "../domain/preparation/planner";
import { objectives, PROGRAM_LABEL } from "../data/program";
const titles = [
  "Bienvenue chez vous.",
  "Faisons connaissance.",
  "Votre prochain grand cap.",
  "À quel horizon ?",
  "Votre objectif de tours.",
  "À votre rythme.",
  "Votre objectif, votre chemin.",
  "Votre parcours vous attend.",
];
export default function Onboarding() {
  const { profile, state, saveProfile, busy } = usePreparation();
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const problems = validateProfile(draft);
  const preview = useMemo(
    () =>
      problems.length
        ? null
        : buildPlan(
            objectives,
            { ...state, profile: draft },
            todayInZone(draft.timeZone),
          ),
    [draft, state, problems.join("|")],
  );
  const finish = async () => {
    try {
      await saveProfile({ ...draft, name: draft.name.trim() });
      router.dismissTo("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  };
  return (
    <Screen
      title="norya."
      subtitle="Votre avenir commence par un petit pas."
      back
    >
      <View
        style={{ maxWidth: 620, width: "100%", alignSelf: "center", gap: 22 }}
      >
        <Progress value={((step + 1) / 8) * 100} />
        <Txt size={12} color={c.muted}>
          VOTRE PARCOURS · {step + 1} / 8
        </Txt>
        <Card style={{ padding: 30, minHeight: 320 }}>
          <View style={[s.iconBox, { backgroundColor: c.mint }]}>
            <Icon name="leaf-outline" color={c.primary} />
          </View>
          <Txt size={27} bold>
            {titles[step]}
          </Txt>
          {step === 0 && (
            <>
              <Txt color={c.muted}>
                Apprendre, comprendre, mémoriser. Un programme clair, calculé
                selon vos disponibilités, et une place pour souffler.
              </Txt>
              <Txt>Votre préparation est conservée sur cet appareil.</Txt>
              <Txt size={12} color={c.muted}>
                {PROGRAM_LABEL} · périmètre défini par la Tematica officielle.
              </Txt>
            </>
          )}
          {step === 1 && (
            <>
              <Txt>Comment souhaitez-vous être appelé·e ?</Txt>
              <TextInput
                accessibilityLabel="Prénom"
                style={s.input}
                value={draft.name}
                onChangeText={(name) => setDraft({ ...draft, name })}
                maxLength={60}
              />
            </>
          )}
          {step === 2 && (
            <>
              <Txt>Concours ciblé</Txt>
              <Chip label="Rezidențiat · Medicină · 2026" selected />
              <Txt size={12} color={c.muted}>
                Le programme reste strictement limité aux chapitres et pages
                indiqués dans la Tematica de novembre 2026.
              </Txt>
            </>
          )}
          {step === 3 && <DateFields profile={draft} onChange={setDraft} />}
          {step === 4 && <PassFields profile={draft} onChange={setDraft} />}
          {step === 5 && (
            <AvailabilityFields profile={draft} onChange={setDraft} />
          )}
          {step === 6 && <GoalFields profile={draft} onChange={setDraft} showPasses={false} />}
          {step === 7 && (
            <>
              <Txt>Prêt·e, {draft.name} ?</Txt>
              <Txt>
                {draft.exam} {draft.year} · {weeklyCapacity(draft)} min
                disponibles par semaine.
              </Txt>
              {preview && (
                <PlanStatus plan={preview} profile={draft} editable={false} />
              )}
              <Txt size={12} color={c.muted}>
                Les prévisions de rappel supposent une réussite future. Vos
                résultats réels modifieront leurs dates, sans effacer vos
                acquis.
              </Txt>
            </>
          )}
        </Card>
        {(step === 7 ? problems : []).map((p) => (
          <Txt key={p} color="#9A513C">
            {p}
          </Txt>
        ))}
        {!!error && <Txt color="#9A513C">{error}</Txt>}
        <Button
          title={
            step === 7
              ? busy
                ? "Enregistrement…"
                : "Créer mon calendrier"
              : "Continuer"
          }
          icon="arrow-forward"
          disabled={
            busy ||
            (step === 1 && !draft.name.trim()) ||
            (step === 7 && problems.length > 0)
          }
          onPress={() => (step < 7 ? setStep(step + 1) : void finish())}
        />
        {step > 0 && (
          <Button
            title="Précédent"
            secondary
            disabled={busy}
            onPress={() => setStep(step - 1)}
          />
        )}
      </View>
    </Screen>
  );
}
