import { useEffect, useState } from "react";
import { View, Switch, TextInput } from "react-native";
import { router } from "expo-router";
import { Screen, Card, Txt, Button, RowLink, Icon, s } from "../components/ui";
import { usePreparation } from "../state/PreparationProvider";
import {
  DateFields,
  AvailabilityFields,
  GoalFields,
} from "../components/PreparationFields";
import { PlanStatus } from "../components/PreparationSummary";
import { validateProfile } from "../domain/preparation/profile";
import { formatDay } from "../domain/preparation/dates";
import { colors as c } from "../design/theme";
export default function Profile() {
  const { profile, state, plan, saveProfile, busy, setNotifications } =
    usePreparation();
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const persist = async () => {
    setError("");
    try {
      await saveProfile({ ...draft, name: name.trim() });
      setSaved(true);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  };
  const [name, setName] = useState(profile.name);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setDraft(profile);
    setName(profile.name);
  }, [profile]);
  const notifications = state.notifications;
  const [privacy, setPrivacy] = useState(false);
  const [plus, setPlus] = useState(false);
  return (
    <Screen
      title="Votre espace personnel"
      subtitle="Une préparation qui vous ressemble."
      back
    >
      <Card>
        <View style={s.row}>
          <View
            style={[
              s.iconBox,
              { width: 64, height: 64, backgroundColor: c.peach },
            ]}
          >
            <Txt size={26} bold>
              {profile.name.charAt(0)}
            </Txt>
          </View>
          <View>
            <Txt size={22} bold>
              {profile.name}
            </Txt>
            <Txt color={c.muted}>
              {profile.exam} · {profile.year}
            </Txt>
          </View>
        </View>
        <Txt size={13}>Prénom</Txt>
        <TextInput
          accessibilityLabel="Prénom du profil"
          style={s.input}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setSaved(false);
          }}
          maxLength={30}
        />
        <Button
          title={saved ? "Profil enregistré" : "Enregistrer"}
          disabled={busy || !name.trim()}
          onPress={() => void persist()}
        />
        <Txt size={13} color={c.muted}>
          {profile.specialties.join(" · ") || "Aucune spécialité choisie"}
        </Txt>
        <Txt size={13}>
          Concours : {formatDay(plan.examOn)} ·{" "}
          {profile.examDate.official
            ? "date déclarée officielle"
            : "date provisoire"}
        </Txt>
        <Txt size={13}>{profile.goal}</Txt>
        <Button
          title="Modifier mon parcours"
          secondary
          onPress={() => router.push("/onboarding")}
        />
      </Card>
      <PlanStatus plan={plan} profile={profile} editable={false} />
      <Card>
        <Button
          title={editing ? "Fermer les réglages" : "Disponibilités et dates"}
          secondary
          onPress={() => {
            setDraft(profile);
            setEditing(!editing);
            setSaved(false);
          }}
        />
        {editing && (
          <>
            <AvailabilityFields profile={draft} onChange={setDraft} />
            <DateFields profile={draft} onChange={setDraft} />
            <GoalFields profile={draft} onChange={setDraft} />
            <Button
              title={busy ? "Enregistrement…" : "Enregistrer et recalculer"}
              disabled={
                busy ||
                validateProfile({ ...draft, name: name.trim() }).length > 0
              }
              onPress={() => void persist()}
            />
            {validateProfile({ ...draft, name: name.trim() }).map((p) => (
              <Txt key={p} color="#9A513C">
                {p}
              </Txt>
            ))}
          </>
        )}
        {!!error && <Txt color="#9A513C">{error}</Txt>}
      </Card>
      <Card>
        <Txt bold size={20}>
          Paramètres
        </Txt>
        <View style={s.between}>
          <View style={{ flex: 1 }}>
            <Txt>Rappels de révision</Txt>
            <Txt size={12} color={c.muted}>
              Préférence enregistrée, sans notification système pour le moment.
            </Txt>
          </View>
          <Switch
            accessibilityLabel="Rappels de révision"
            trackColor={{ true: c.primary, false: c.line }}
            value={notifications}
            onValueChange={(value) =>
              void setNotifications(value).catch(() => {})
            }
          />
        </View>
        <RowLink
          title="Confidentialité"
          icon="shield-checkmark-outline"
          onPress={() => setPrivacy(!privacy)}
        />
        {privacy && (
          <Txt size={13} color={c.muted}>
            Aucune donnée n’est envoyée à un serveur. Le profil, les notes et le
            travail enregistré sont conservés sur cet appareil. Le stockage
            local n’est pas chiffré. Supprimer les données de l’application ou
            du navigateur les efface. Aucun compte, traceur ou microphone n’est
            connecté.
          </Txt>
        )}
      </Card>
      <Card style={{ backgroundColor: c.mint }}>
        <Icon name="sparkles-outline" color={c.primary} />
        <Txt bold size={24}>
          Norya Plus
        </Txt>
        <Txt>Un aperçu de votre futur compagnon de préparation enrichi.</Txt>
        <Button
          title="Découvrir Norya Plus"
          secondary
          onPress={() => setPlus(!plus)}
        />
        {plus && (
          <Txt>
            Fonctionnalités envisagées : accompagnement personnalisé, podcasts
            de révision et suivi approfondi. Offre non commercialisée ; aucun
            paiement ni abonnement n’est possible dans cette maquette.
          </Txt>
        )}
      </Card>
      <Txt size={12} color={c.muted}>
        Norya · Préparation locale ·{" "}
        {busy ? "Enregistrement…" : "Données sauvegardées sur cet appareil"}
      </Txt>
    </Screen>
  );
}
