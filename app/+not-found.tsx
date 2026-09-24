import { router } from 'expo-router';
import { Screen, Button } from '../src/components/ui';
export default function NotFound(){return <Screen title="Ce chemin reste à explorer." subtitle="Retrouvez votre programme et poursuivez votre préparation."><Button title="Retour à l’accueil" onPress={()=>router.replace('/')}/></Screen>}
