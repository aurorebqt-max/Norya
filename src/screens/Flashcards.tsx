import { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen, Card, Txt, Chip, Button, Progress, RowLink, s } from "../components/ui";
import { useDemo } from "../state/DemoProvider";
import { colors as c } from "../design/theme";
import { todayInZone } from "../domain/preparation/dates";

export default function Flashcards() {
  const { availableCards, cardProgress, reviewCard } = useDemo();
  const decks = useMemo(() => [...new Set(availableCards.map((card) => card.subject))], [availableCards]);
  const [deck, setDeck] = useState("Tous");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const cards = availableCards.filter((card) => deck === "Tous" || card.subject === deck);
  const current = cards[index % Math.max(cards.length, 1)];
  const due = cards.filter((card) => (cardProgress[card.id]?.nextReviewOn ?? "") <= todayInZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris")).length;
  if (!current)
    return (
      <Screen title="Mes Decks" subtitle="Les cartes apparaîtront après la validation d’une fiche." back>
        <Card><Txt>Validez le premier passage de la fiche du syndrome néphrotique pour débloquer le deck.</Txt><Button title="Ouvrir la bibliothèque" onPress={() => router.replace("/library")} /></Card>
      </Screen>
    );
  const rate = async (rating: "again" | "hard" | "good" | "easy") => {
    await reviewCard(current.id, rating);
    setRevealed(false);
    setIndex((value) => (value + 1) % cards.length);
  };
  return (
    <Screen title="Mes Decks" subtitle="Cartes recto-verso et répétition espacée locale." back>
      <Card style={{ backgroundColor: c.mint }}>
        <Txt size={12} color={c.primary}>CARTES MÉDICALES · SOURCE AFFICHÉE DANS LA FICHE</Txt>
        <Txt>{availableCards.length} cartes débloquées · {due} à revoir aujourd’hui ou en retard.</Txt>
        <View style={s.wrap}>{["Tous", ...decks].map((name) => <Chip key={name} label={name} selected={deck === name} onPress={() => { setDeck(name); setIndex(0); setRevealed(false); }} />)}</View>
        <Progress value={availableCards.length ? (availableCards.filter((card) => cardProgress[card.id]?.historyCount > 0).length / availableCards.length) * 100 : 0} />
      </Card>
      <Card>
        <Txt size={12} color={c.muted}>{current.subject} · objectif {current.objectiveId}</Txt>
        <Txt bold size={24}>{current.recto}</Txt>
        {!revealed ? <Button title="Retourner la carte" onPress={() => setRevealed(true)} /> : (
          <>
            <Txt color={c.primary} bold>Verso</Txt>
            <Txt>{current.verso}</Txt>
            {current.explanation && <Txt size={13} color={c.muted}>{current.explanation}</Txt>}
            <Txt bold>Autoévaluation</Txt>
            <View style={s.wrap}>
              <Chip label="À revoir" onPress={() => void rate("again")} />
              <Chip label="Difficile" onPress={() => void rate("hard")} />
              <Chip label="Bien" onPress={() => void rate("good")} />
              <Chip label="Facile" onPress={() => void rate("easy")} />
            </View>
          </>
        )}
        <Txt size={12} color={c.muted}>Échéance : {cardProgress[current.id]?.nextReviewOn ?? "aujourd’hui"}</Txt>
      </Card>
      <RowLink title="Retourner à la fiche" subtitle="Le statut du premier passage reste dans votre calendrier." icon="book-outline" href="/library" />
    </Screen>
  );
}
