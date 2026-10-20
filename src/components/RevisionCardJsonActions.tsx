import { useState } from 'react';
import { View } from 'react-native';
import { Button, Txt } from './ui';
import type { FinalCourseArchive } from '../domain/sourceCourse/finalization';
import { buildCourseStructure } from '../domain/sourceCourse/courseStructure';
import { buildRevisionCardSet } from '../domain/sourceCourse/revisionCards';
import { loadRevisionCards, saveRevisionCards } from '../domain/sourceCourse/revisionCardsStorage';
import { downloadPrivateJson, pickPrivateJson } from '../services/storage/chapterBackup';

const instructions = `Transforme les sections de ce JSON en une fiche médicale de révision exhaustive mais concise. Respecte STRICTEMENT le JSON : ne modifie aucun champ sauf sections[].items. Conserve tous les éléments sections[], leurs id, level, title et leur ordre. Dans items, reformule en français si le contenu fourni est français, sinon conserve la langue source ; utilise des tirets, des sous-tirets et des flèches. Préserve chaque fait, chiffre, unité, seuil, négation, exception, critère, traitement et détail pertinent ; ne déduis rien qui n'est pas dans le cours. Ne remplace jamais un passage incertain par une invention. Conserve les références aux tableaux et figures dans les items. Renvoie uniquement un fichier JSON complet valide, sans markdown. Vérifie que tous les blocs sont couverts avant de terminer.`;

export function RevisionCardJsonActions({ chapterId, archive }: { chapterId: string; archive: FinalCourseArchive | null }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function run(task: () => Promise<void>) {
    if (busy) return; setBusy(true); setNotice('');
    try { await task(); } catch (e) { setNotice(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  function model() {
    if (!archive || archive.status !== 'finalized') throw new Error('Finalisez d’abord le cours.');
    const version = archive.versions.find(v => v.version === archive.activeVersion);
    if (!version) throw new Error('Version de cours introuvable.');
    const structure = buildCourseStructure(version.packet, version.validation, version.presentations);
    const draft = buildRevisionCardSet(chapterId, archive, structure, version.validation);
    if (!draft) throw new Error('Impossible de construire le modèle.');
    return draft;
  }
  return <View style={{ gap: 6 }}>
    <Button title="Exporter modèle de fiche pour ChatGPT (JSON)" secondary disabled={busy || archive?.status !== 'finalized'} onPress={() => void run(async () => {
      const draft = model();
      downloadPrivateJson(`norya-modele-fiche-${chapterId}.json`, { ...draft, instructions });
      setNotice('Envoyez le JSON à ChatGPT : seules les listes items doivent être reformulées.');
    })} />
    <Button title="Importer fiche (JSON)" secondary disabled={busy || archive?.status !== 'finalized'} onPress={() => void run(async () => {
      const raw = await pickPrivateJson(); if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON de fiche invalide.');
      const obj = parsed as Record<string, unknown>;
      if (obj.chapterId !== chapterId) throw new Error('Fiche provenant d’un autre chapitre.');
      const expected = model();
      if (obj.sourceVersion !== expected.sourceVersion || obj.structureKey !== expected.structureKey || obj.version !== expected.version) throw new Error('La fiche correspond à une autre version du cours.');
      if (!Array.isArray(obj.sections) || obj.sections.length !== expected.sections.length) throw new Error('Des sections de la fiche manquent.');
      for (let i = 0; i < expected.sections.length; i++) {
        const source = obj.sections[i] as Record<string, unknown> | undefined;
        const target = expected.sections[i];
        if (!source || source.id !== target.id || source.level !== target.level || source.title !== target.title || !Array.isArray(source.items) || source.items.some(x => typeof x !== 'string')) throw new Error(`Section ${i + 1} modifiée ou manquante.`);
        if (target.items.length && !source.items.length) throw new Error(`La section « ${target.title} » a perdu son contenu.`);
      }
      const previous = await loadRevisionCards(chapterId);
      const replacement = { ...expected, sections: obj.sections as typeof expected.sections, createdAt: previous?.createdAt ?? expected.createdAt, updatedAt: new Date().toISOString(), manualEdits: true };
      await saveRevisionCards(replacement); // Le stockage conserve aussi l'ancienne fiche dans son historique.
      setNotice('Fiche importée et sauvegardée. Ouvrez l’onglet Fiches ; actualisez si nécessaire. Relisez les informations médicales.');
    })} />
    <Button title="Exporter fiche enregistrée (JSON)" secondary disabled={busy} onPress={() => void run(async () => {
      const saved = await loadRevisionCards(chapterId);
      if (!saved) throw new Error('Aucune fiche enregistrée pour ce chapitre.');
      downloadPrivateJson(`norya-fiche-${chapterId}.json`, saved);
    })} />
    {!!notice && <Txt>{notice}</Txt>}
  </View>;
}
