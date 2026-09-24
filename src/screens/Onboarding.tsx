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
import type { Exam } from "../domain/preparation/types";
const titles = [
  "Bienvenue chez vous.",
  "Faisons connaissance.",
  "Votre prochain grand cap.",
  "À quel horizon ?",
  "Ce qui vous inspire.",
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
                {PROGRAM_LABEL} · Référentiel EDN officiel à intégrer
                ultérieurement.
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
              <Txt>Quel concours préparez-vous ?</Txt>
              {(
                ["EDN & ECOS", "EDN", "ECOS", "Résidanat roumain"] as Exam[]
              ).map((exam) => (
                <Chip
                  key={exam}
                  label={
                    exam + (exam === "Résidanat roumain" ? " · à venir" : "")
                  }
                  selected={draft.exam === exam}
                  onPress={() => setDraft({ ...draft, exam })}
                />
              ))}
              <Txt size={12} color={c.muted}>
                Le moteur peut organiser ce programme de démonstration pour
                chaque parcours. Les référentiels ECOS et roumain ne sont pas
                encore intégrés.
              </Txt>
            </>
          )}
          {step === 3 && <DateFields profile={draft} onChange={setDraft} />}
          {step === 4 && (
            <>
              <Txt>Spécialités envisagées · facultatif</Txt>
              <View style={s.wrap}>
                {[
                  "Ophtalmologie",
                  "Dermatologie",
                  "Cardiologie",
                  "Médecine générale",
                  "Pédiatrie",
                  "Chirurgie",
                ].map((x) => (
                  <Chip
                    key={x}
                    label={x}
                    selected={draft.specialties.includes(x)}
                    onPress={() =>
                      setDraft({
                        ...draft,
                        specialties: draft.specialties.includes(x)
                          ? draft.specialties.filter((v) => v !== x)
                          : [...draft.specialties, x],
                      })
                    }
                  />
                ))}
              </View>
              <Txt size={13} color={c.muted}>
                Vous gardez toujours accès à l’ensemble du programme, même sans
                spécialité choisie.
              </Txt>
            </>
          )}
          {step === 5 && (
            <AvailabilityFields profile={draft} onChange={setDraft} />
          )}
          {step === 6 && <GoalFields profile={draft} onChange={setDraft} />}
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
