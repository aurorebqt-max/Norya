import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Screen, Card, Txt, Button, RowLink } from '../components/ui';
import { examRules } from '../data/examRules';
import { historicalRezidentiatCutoffs } from '../data/historicalResults';
import { listPublishedQcm } from '../services/cloud/qcmBank';

export default function Practice() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; listPublishedQcm().then(rows => { if (active) setCount(rows.length); }).catch(e => { if (active) setError(e instanceof Error ? e.message : String(e)); }); return () => { active = false; }; }, []);
  return <Screen title="S’entraîner" subtitle="QCM validés de la banque Supabase, résultats sauvegardés et erreurs révisables.">
    <Card>
      <Txt bold size={20}>Banque de QCM</Txt>
      <Txt>{count === null ? 'Chargement…' : `${count} question(s) publiées sont actuellement disponibles pour les entraînements.`}</Txt>
      {!!error && <Txt size={12}>{error}</Txt>}
      <Button title="Commencer une séance" onPress={() => router.push('/quiz')} />
      <Button title="Ouvrir / gérer la banque de QCM" secondary onPress={() => router.push('/question-bank')} />
    </Card>
    <Card>
      <Txt bold size={20}>Examen blanc</Txt>
      <Txt>Une séance générale peut déjà utiliser jusqu’à {examRules.questions} questions publiées. La répartition par chapitre et les pourcentages seront configurés séparément.</Txt>
    </Card>
    <Card>
      <Txt bold size={20}>Résultats historiques et spécialités</Txt>
      {historicalRezidentiatCutoffs.length ? <Txt>Des seuils historiques sourcés sont disponibles. Ils décrivent une année passée et ne prédisent pas un rang futur.</Txt> : <Txt>Aucune donnée officielle de classement par score, spécialité et centre n’est actuellement importée et vérifiée.</Txt>}
    </Card>
    <Card>
      <RowLink title="Mes erreurs" subtitle="Questions ratées, historique et échéances locales." icon="layers-outline" href="/errors" />
      <RowLink title="Mes flashcards" subtitle="Rappels espacés séparés de la validation de lecture." icon="albums-outline" href="/flashcards" />
      <RowLink title="Ma progression" subtitle="Tours, validations et historique du calendrier." icon="stats-chart-outline" href="/progress" />
    </Card>
  </Screen>;
}
