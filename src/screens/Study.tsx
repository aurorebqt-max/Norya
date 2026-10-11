import { passProgress, passRemaining, passSuggestion } from "../domain/preparation/passes";
import { useRef, useState } from "react";
import { View, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Card, Txt, Button, Chip, Progress, s } from "../components/ui";
import { usePreparation } from "../state/PreparationProvider";
import { objectives, PROGRAM_LABEL } from "../data/program";
import { emptyProgress } from "../domain/preparation/progress";
import type { Performance, WorkKind } from "../domain/preparation/types";
import { colors as c } from "../design/theme";
export default function Study() {
  const params = useLocalSearchParams<{
    objectiveId: string;
    kind?: string;
    pass?: string;
    minutes?: string;
  }>();
  const { state, record, busy } = usePreparation();
  const objective = objectives.find((o) => o.id === params.objectiveId);
  const [pass, setPass] = useState(Math.min(10, Math.max(1, Number(params.pass) || (params.kind === "second" ? 2 : 1))));
  const [kind, setKind] = useState<WorkKind>(
    params.kind === "review" ? "review" : "pass",
  );
  const [minutes, setMinutes] = useState(params.minutes ?? "");
  const [performance, setPerformance] = useState<Performance>("good");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const actionId = useRef("");
  const inFlight = useRef(false);
  if (!objective)
    return (
      <Screen title="Objectif introuvable" back>
        <Button
          title="Retour à la bibliothèque"
          onPress={() => router.replace("/library")}
        />
      </Screen>
    );
  const p = state.progress[objective.id] ?? emptyProgress();
  const current = passProgress(p, pass);
  const remaining = kind === 'review' ? objective.reviewMinutes-p.reviewMinutes : passRemaining(objective,p,state.profile,pass);
  const already = kind === 'pass' && !!current.completedOn;
  const amount = minutes === "" ? remaining : Number(minutes);
  const save = async (finish: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError("");
    setMessage("");
    if (!actionId.current)
      actionId.current =
        "work-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2);
    try {
      await record({
        id: actionId.current,
        objectiveId: objective.id,
        kind,
        ...(kind === "pass" ? { pass } : {}),
        minutes: amount,
        completed: finish,
        source: "self",
        ...(kind === "review" && finish ? { performance } : {}),
      });
      setMessage(
        finish
          ? "Séance validée. Votre calendrier et votre progression sont actualisés."
          : "Avancement enregistré. Le reste est replanifié.",
      );
      setMinutes("");
      actionId.current = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      inFlight.current = false;
    }
  };
  return (
    <Screen
      title={objective.title}
      subtitle={objective.subject + " · " + PROGRAM_LABEL}
      back
    >
      <View
        style={{ maxWidth: 740, width: "100%", alignSelf: "center", gap: 22 }}
      >
        <Card>
          <Txt size={12} color={c.primary}>
            TRAVAIL DÉCLARÉ · AUCUNE ÉVALUATION MÉDICALE
          </Txt>
          <Txt>
            Utilisez votre support de cours pour travailler cet objectif, puis
            enregistrez le temps effectué. Ouvrir cette page ne valide aucun
            acquis.
          </Txt>
          <View style={s.wrap}>
            {Array.from({length: Math.max(state.profile.targetPasses ?? 2, p.secondCompletedOn ? 2 : 1, ...Object.keys(p.passes ?? {}).map(Number))}, (_,i)=>i+1).map(n => <Chip key={n} label={`Tour ${n}${passProgress(p,n).completedOn ? ' ✓' : ''}`} selected={kind === 'pass' && pass === n} onPress={()=>{setPass(n);setKind('pass');setMinutes('');actionId.current='';setMessage('');setError('');}} />)}
            <Chip label="Rappel espacé" selected={kind === 'review'} onPress={()=>{setKind('review');setMinutes('');actionId.current='';}} />
          </View>
          <Txt>{passSuggestion(pass)} · suggestion, lecture libre.</Txt>
          <Button title="Consulter le chapitre et ses sources" secondary onPress={()=>router.push({pathname:'/chapter',params:{id:objective.id}})} />
          <Txt size={13}>Tour {pass} : {current.completedOn ? 'Terminé le ' + current.completedOn : `${current.minutes} min enregistrées · à terminer`}</Txt>
          {!state.onboarded ? (
            <Button
              title="Configurer mon profil"
              onPress={() => router.push("/onboarding")}
            />
          ) : already ? (
            <Txt bold>
              Ce passage est déjà terminé. Vous pouvez choisir un rappel actif.
            </Txt>
          ) : (kind === "review" && !passProgress(p,1).completedOn) || (kind === "pass" && pass > 1 && !passProgress(p,pass-1).completedOn) ? (
            <Txt>Terminez le passage précédent de ce chapitre avant cette validation.</Txt>
          ) : (
            <>
              <Txt size={13}>
                Durée restante pour ce passage : {remaining} min
              </Txt>
              <TextInput
                accessibilityLabel="Minutes travaillées"
                style={s.input}
                keyboardType="number-pad"
                value={minutes}
                placeholder={String(remaining)}
                onChangeText={(v) => {
                  setMinutes(v);
                  actionId.current = "";
                }}
              />
              <Txt size={12} color={c.muted}>
                Indiquez la durée de cette séance, pas le cumul. Validez explicitement quand le chapitre est terminé, même plus tôt que prévu.
              </Txt>
              {kind === "review" && (
                <>
                  <Txt>
                    Après un rappel de mémoire, comment vous sentez-vous ?
                  </Txt>
                  <View style={s.wrap}>
                    {(
                      [
                        { value: "again", label: "À revoir" },
                        { value: "hard", label: "Difficile" },
                        { value: "good", label: "Rappel réussi" },
                      ] as const
                    ).map((x) => (
                      <Chip
                        key={x.value}
                        label={x.label}
                        selected={performance === x.value}
                        onPress={() => {
                          setPerformance(x.value);
                          actionId.current = "";
                        }}
                      />
                    ))}
                  </View>
                  <Txt size={12} color={c.muted}>
                    Une autoévaluation ajuste les rappels mais ne classe jamais
                    l’objectif comme maîtrisé. Les évaluations QCM seront
                    intégrées ultérieurement.
                  </Txt>
                </>
              )}
              <Button
                title={
                  busy ? "Enregistrement…" : "Enregistrer une séance partielle"
                }
                secondary
                disabled={
                  busy ||
                  !Number.isInteger(amount) ||
                  amount <= 0 ||
                  (kind === "review" && amount >= remaining)
                }
                onPress={() => void save(false)}
              />
              <Button
                title={busy ? "Enregistrement…" : "Valider ce passage terminé"}
                disabled={busy || !Number.isInteger(amount) || amount <= 0 || (kind === "review" && amount !== remaining)}
                onPress={() => void save(true)}
              />
            </>
          )}
          {!!message && <Txt color={c.primary}>{message}</Txt>}
          {!!error && <Txt color="#9A513C">{error}</Txt>}
          <Button
            title="Retour à mon programme"
            secondary
            onPress={() => router.dismissTo("/")}
          />
        </Card>
      </View>
    </Screen>
  );
}
