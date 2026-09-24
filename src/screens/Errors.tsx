import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Card,
  Txt,
  Chip,
  Button,
  Progress,
  Icon,
  s,
} from "../components/ui";
import { errors, stats } from "../data/demo";
import { useDemo } from "../state/DemoProvider";
import { colors as c } from "../design/theme";
export default function Errors() {
  const { resolved } = useDemo();
  const [filter, setFilter] = useState("À revoir");
  const [open, setOpen] = useState<string | null>(null);
  const visible = errors.filter(
    (x) =>
      filter === "Tout" ||
      (filter === "Revues"
        ? resolved.includes(x.id)
        : !resolved.includes(x.id)),
  );
  return (
    <Screen
      title="Le carnet qui fait progresser"
      subtitle="Aperçu fictif du futur carnet · non relié à votre progression locale."
      back
    >
      <Card style={{ backgroundColor: c.lavender }}>
        <View style={s.row}>
          <Icon name="layers-outline" />
          <Txt bold size={22}>
            {errors.length - resolved.length} notions à consolider
          </Txt>
        </View>
        <Txt>
          {stats.consolidated + resolved.length} notions déjà revues ·
          Historique fictif
        </Txt>
        <Progress
          value={
            ((stats.consolidated + resolved.length) /
              (stats.consolidated + errors.length)) *
            100
          }
        />
      </Card>
      <View style={s.wrap}>
        {["À revoir", "Revues", "Tout"].map((x) => (
          <Chip
            key={x}
            label={x}
            selected={filter === x}
            onPress={() => setFilter(x)}
          />
        ))}
      </View>
      {visible.map((x) => (
        <Card key={x.id}>
          <View style={s.between}>
            <Chip label={x.subject} />
            <Txt size={12} color={c.muted}>
              {resolved.includes(x.id)
                ? "Revue aujourd’hui"
                : x.count + " hésitations"}
            </Txt>
          </View>
          <Txt size={21} bold>
            {x.title}
          </Txt>
          <Button
            title={
              open === x.id ? "Fermer la mini-fiche" : "Ouvrir la mini-fiche"
            }
            secondary
            onPress={() => setOpen(open === x.id ? null : x.id)}
          />
          {open === x.id && (
            <>
              <Txt>
                Repère de méthode : notez ce qui vous a fait hésiter, reformulez
                votre raisonnement et prévoyez une courte révision.
              </Txt>
              <Txt size={12} color={c.muted}>
                Cette mini-fiche illustre la forme du futur carnet, sans contenu
                clinique.
              </Txt>
              <Button
                title="Consolider en 3 questions"
                onPress={() =>
                  router.push("/session?mode=consolidation&error=" + x.id)
                }
              />
            </>
          )}
        </Card>
      ))}
      {!visible.length && (
        <Card>
          <Icon name="checkmark-circle-outline" color={c.primary} />
          <Txt>
            Aucune notion dans cette catégorie. Votre carnet vous attend après
            vos prochaines séances.
          </Txt>
        </Card>
      )}
    </Screen>
  );
}
