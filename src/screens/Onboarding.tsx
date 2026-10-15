import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, Txt, Icon, Button, Progress } from '../components/ui';
import { PassFields, DateFields, AvailabilityFields } from '../components/PreparationFields';
import { PlanStatus } from '../components/PreparationSummary';
import { usePreparation } from '../state/PreparationProvider';
import { colors as c } from '../design/theme';
import { validateProfile, weeklyCapacity } from '../domain/preparation/profile';
import { todayInZone } from '../domain/preparation/dates';
import { buildPlan } from '../domain/preparation/planner';
import { objectives, PROGRAM_LABEL } from '../data/program';

export default function Onboarding() {
  const { profile, state, saveProfile, busy } = usePreparation();
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const candidate = { ...draft, name: draft.name.trim() || 'Étudiant' };
  const problems = validateProfile(candidate);
  const preview = useMemo(
    () => problems.length ? null : buildPlan(
      objectives,
      { ...state, profile: candidate },
      todayInZone(candidate.timeZone),
    ),
    [candidate, state, problems.join('|')],
  );
  const finish = async () => {
    try {
      await saveProfile(candidate);
      router.dismissTo('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  };
  return <Screen title="norya." subtitle="Votre préparation, simplement." back>
    <View style={{ maxWidth: 620, width: '100%', alignSelf: 'center', gap: 22 }}>
      <Progress value={(step + 1) / 4 * 100} />
      <Txt size={12} color={c.muted}>VOTRE PARCOURS · {step + 1} / 4</Txt>
      <Card style={{ padding: 30, minHeight: 300 }}>
        <View style={[{ width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: c.mint }]}>
          <Icon name="leaf-outline" color={c.primary} />
        </View>
        {step === 0 && <>
          <Txt size={27} bold>Un parcours clair, dès aujourd’hui.</Txt>
          <Txt color={c.muted}>Norya prépare le concours roumain de rezidențiat, médecine. Votre calendrier et vos progrès restent sur cet appareil.</Txt>
          <Txt size={12} color={c.muted}>{PROGRAM_LABEL} · date modifiable tant qu’elle n’est pas confirmée officiellement.</Txt>
        </>}
        {step === 1 && <>
          <Txt size={27} bold>Quelle est la date du concours ?</Txt>
          <DateFields profile={draft} onChange={setDraft} />
        </>}
        {step === 2 && <>
          <Txt size={27} bold>Organisons votre rythme.</Txt>
          <PassFields profile={draft} onChange={setDraft} />
          <AvailabilityFields profile={draft} onChange={setDraft} />
        </>}
        {step === 3 && <>
          <Txt size={27} bold>Votre calendrier est prêt.</Txt>
          <Txt>{weeklyCapacity(candidate)} minutes disponibles par semaine.</Txt>
          {preview && <PlanStatus plan={preview} profile={candidate} editable={false} />}
          <Txt size={12} color={c.muted}>Les prévisions évolueront avec vos validations et vos résultats. Les données déjà enregistrées sont conservées.</Txt>
        </>}
      </Card>
      {(step === 3 ? problems : []).map(problem => <Txt key={problem} color="#9A513C">{problem}</Txt>)}
      {!!error && <Txt color="#9A513C">{error}</Txt>}
      <Button title={step === 3 ? (busy ? 'Enregistrement…' : 'Créer mon calendrier') : 'Continuer'}
        icon="arrow-forward" disabled={busy || (step === 3 && problems.length > 0)}
        onPress={() => step < 3 ? setStep(step + 1) : void finish()} />
      {step > 0 && <Button title="Précédent" secondary disabled={busy} onPress={() => setStep(step - 1)} />}
    </View>
  </Screen>;
}
