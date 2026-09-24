import { Screen, Card, Txt, Chip, RowLink } from "../src/components/ui";
import { medicalSources } from "../src/data/medical";
import { colors as c } from "../src/design/theme";

export default function Sources() {
  return (
    <Screen title="Sources et mises à jour" subtitle="Registre éditorial local · aucune licence officielle reproduite" back>
      <Card style={{ backgroundColor: c.peach }}>
        <Txt bold>Ce qui a changé</Txt>
        <Txt>Le contenu néphrologique a été rattaché à une référence publique de travail et marqué en attente de validation médicale.</Txt>
      </Card>
      {medicalSources.map((source) => <Card key={source.id}><Txt bold>{source.source}</Txt><Txt>{source.version}</Txt><Txt size={13} color={c.muted}>Version suivie : {source.verifiedAt} · session cible : {source.targetExamSession}</Txt><Chip label={source.status === "verified" ? "Validée" : source.status === "needs_review" ? "À vérifier médicalement" : "Obsolète"} selected={source.status === "verified"} /><Txt size={12} color={source.accessStatus === "accessible" ? c.primary : "#9A513C"}>Accès vérifié : {source.accessStatus === "accessible" ? "oui" : source.accessStatus === "partial" ? "partiel" : "non lors de la dernière vérification"}</Txt>{source.notes && <Txt size={12} color={c.muted}>{source.notes}</Txt>}<RowLink title="Ouvrir la référence publique" subtitle={source.url ?? "Aucun lien fourni"} href={source.url as `https://${string}`} /></Card>)}
      <Txt size={12} color={c.muted}>Norya ne présente aucun contenu non vérifié comme prêt à publier. Les licences et conditions d’utilisation doivent être contrôlées par l’équipe éditoriale.</Txt>
    </Screen>
  );
}
