import { router } from 'expo-router';
import { Screen, Card, Txt, Button } from '../components/ui';
import { romanianLessons } from '../data/romanianLessons';

export default function Podcasts() {
  return <Screen title="Écoute des cours" subtitle="Lecture vocale locale · aucun podcast fictif proposé" back>
    <Card>
      <Txt>Aucun podcast préenregistré n’est disponible pour le moment. Les cours roumains peuvent être écoutés depuis leur page; la voix est générée localement au démarrage de la lecture.</Txt>
    </Card>
    {romanianLessons.map(lesson => <Card key={lesson.chapterId}>
      <Txt bold>{lesson.title.ro}</Txt>
      <Txt size={12}>{lesson.sections.length} parties disponibles</Txt>
      <Button title="Ouvrir le cours et lancer la lecture vocale" onPress={() => router.push({ pathname: '/chapter', params: { id: lesson.chapterId } })} />
    </Card>)}
  </Screen>;
}
