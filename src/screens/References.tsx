import { browserPdf } from "../services/storage/privatePdfs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from "expo-router";
import { Button, Card, Chip, RowLink, Screen, Txt, s } from "../components/ui";
import { colors as c } from "../design/theme";
import {
  examChapters,
  examProgramSource,
  errataByChapter,
  errataSource,
  referenceBooks,
  type ExamChapter,
} from "../data/rezidentiat2026";

const STORAGE_KEY = "norya.private-reference-pdfs.v1";
const PRIVATE_DIRECTORY = "norya-private-references";
type StoredPdf = { uri: string; name: string; addedAt: string };
type StoredPdfs = Record<string, StoredPdf>;
const officialDocuments = [
  { id: "official-tematica", title: examProgramSource.title, file: examProgramSource.file },
  { id: "errata-2021", title: errataSource.title, file: errataSource.file },
];

function readStoredPdfs(raw: string | null): StoredPdfs {
  if (raw === null) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Index des PDF privés illisible. Les fichiers locaux ne sont pas supprimés.");
  for (const value of Object.values(parsed)) {
    if (
      !value ||
      typeof value !== "object" ||
      typeof (value as StoredPdf).uri !== "string" ||
      typeof (value as StoredPdf).name !== "string" ||
      typeof (value as StoredPdf).addedAt !== "string"
    )
      throw new Error("Entrée PDF privée invalide. Les fichiers locaux ne sont pas supprimés.");
  }
  return parsed as StoredPdfs;
}

function normalizedFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();
}

function isPdf(asset: DocumentPicker.DocumentPickerAsset) {
  return (
    asset.mimeType === "application/pdf" ||
    asset.name.toLocaleLowerCase().endsWith(".pdf")
  );
}

export default function References() {
  const params = useLocalSearchParams<{ id?: string }>();
  const selectedId = typeof params.id === "string" ? params.id : "";
  const [documents, setDocuments] = useState<StoredPdfs>({});
  const documentsRef = useRef<StoredPdfs>({});
  const [loaded, setLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [query, setQuery] = useState("");
  const [bookFilter, setBookFilter] = useState("Tous");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadingError("");
    try {
      const saved = readStoredPdfs(await AsyncStorage.getItem(STORAGE_KEY));
      documentsRef.current = saved;
      setDocuments(saved);
      setLoaded(true);
    } catch (reason) {
      setLoadingError(
        reason instanceof Error ? reason.message : "Chargement des PDF privés impossible.",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const indexedPdfs = useMemo(() => {
    const entries: { id: string; file: string }[] = [
      ...officialDocuments.map((item) => ({ id: item.id, file: item.file })),
      ...examChapters.flatMap((chapter) =>
        chapter.privateFile ? [{ id: chapter.id, file: chapter.privateFile }] : [],
      ),
    ];
    return new Map(entries.map((entry) => [normalizedFilename(entry.file), entry.id]));
  }, []);

  const storeAssets = async (
    targets: { id: string; asset: DocumentPicker.DocumentPickerAsset }[],
  ) => {
    if (Platform.OS === 'web') {
      const replacements = {...documentsRef.current};
      for (const {id,asset} of targets) {
        const blob = asset.file ?? await (await fetch(asset.uri)).blob();
        const key = `${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await browserPdf(key, blob);
        replacements[id] = {uri:'indexeddb:'+key,name:asset.name,addedAt:new Date().toISOString()};
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(replacements));
      documentsRef.current = replacements;
      setDocuments(replacements);
      return;
    }
    const directory = new Directory(Paths.document, PRIVATE_DIRECTORY);
    directory.create({ intermediates: true, idempotent: true });
    const replacements: StoredPdfs = { ...documentsRef.current };
    const created: File[] = [];
    try {
      for (const { id, asset } of targets) {
        if (!isPdf(asset)) throw new Error(`${asset.name} n’est pas un PDF.`);
        const destination = new File(
          directory,
          `${id}-${Date.now().toString(36)}-${created.length}.pdf`,
        );
        new File(asset.uri).copy(destination);
        created.push(destination);
        replacements[id] = {
          uri: destination.uri,
          name: asset.name,
          addedAt: new Date().toISOString(),
        };
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(replacements));
      documentsRef.current = replacements;
      setDocuments(replacements);
      // Previous private copies are retained; importing never deletes user data.
    } catch (reason) {
      // Preserve copies even if saving the association fails.
      throw reason;
    }
  };

  const pickOne = async (id: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || !isPdf(asset)) throw new Error("Sélectionnez un fichier PDF.");
      await storeAssets([{ id, asset }]);
      setNotice(`${asset.name} est maintenant conservé dans le stockage privé de l’application.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import du PDF impossible.");
    } finally {
      setBusy(false);
    }
  };

  const pickMany = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const matched: { id: string; asset: DocumentPicker.DocumentPickerAsset }[] = [];
      const unmatched: string[] = [];
      for (const asset of result.assets) {
        if (!isPdf(asset)) {
          unmatched.push(asset.name);
          continue;
        }
        const id = indexedPdfs.get(normalizedFilename(asset.name));
        if (id) matched.push({ id, asset });
        else unmatched.push(asset.name);
      }
      const uniqueTargets = new Map(matched.map((entry) => [entry.id, entry]));
      const targets = [...uniqueTargets.values()];
      if (targets.length) await storeAssets(targets);
      setNotice(
        targets.length
          ? `${targets.length} PDF associé(s) par nom de fichier.${unmatched.length ? ` À associer manuellement : ${unmatched.join(", ")}.` : ""}`
          : `Aucun nom de fichier ne correspond à l’index. Associez chaque PDF depuis sa ligne.${unmatched.length ? ` Fichiers : ${unmatched.join(", ")}.` : ""}`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import en lot impossible.");
    } finally {
      setBusy(false);
    }
  };

  const openPdf = async (id: string) => {
    const document = documents[id];
    if (!document) return;
    setError("");
    try {
      if (Platform.OS === 'web') {
        const tab = window.open('about:blank', '_blank');
        if (!tab) throw new Error('Autorisez un nouvel onglet pour le PDF.');
        try {
          const blob = document.uri.startsWith('indexeddb:') ? await browserPdf(document.uri.slice(10)) : undefined;
          if (!blob) throw new Error('Réimportez ce PDF pour le conserver dans ce navigateur.');
          const url = URL.createObjectURL(blob);
          tab.location.href = url;
          setTimeout(()=>URL.revokeObjectURL(url), 300000);
        } catch (error) { tab.close(); throw error; }
        return;
      }
      const file = new File(document.uri);
      if (!file.exists)
        throw new Error("La copie locale est introuvable. Réimportez le PDF depuis sa source privée.");
      if (!(await Sharing.isAvailableAsync())) throw new Error("Aucune application de lecture PDF disponible.");
      await Sharing.shareAsync(file.uri, {mimeType:'application/pdf',dialogTitle:document.name,UTI:'com.adobe.pdf'});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ouverture du PDF impossible.");
    }
  };

  const removePdf = async (id: string) => {
    setError("");
    setNotice("");
    try {
      const next = { ...documentsRef.current };
      const removed = next[id];
      delete next[id];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      documentsRef.current = next;
      setDocuments(next);

      setNotice("Association retirée. La copie privée et le PDF source sont conservés.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression de la copie privée impossible.");
    }
  };

  const filtered = useMemo(
    () =>
      examChapters
        .filter((chapter) => {
          const book = referenceBooks.find((item) => item.id === chapter.bookId)!;
          return (
            (bookFilter === "Tous" || book.id === bookFilter) &&
            `${chapter.chapter} ${chapter.pages} ${chapter.scope.join(" ")} ${book.title}`
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase())
          );
        })
        .sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId)),
    [bookFilter, query, selectedId],
  );

  return (
    <Screen
      title="Référentiel privé"
      subtitle="PDF importés à la demande, conservés localement sur cet appareil."
      back
    >
      <Card style={{ backgroundColor: c.peach }}>
        <Txt bold size={19}>Les PDF ne sont pas dans l’application publiée</Txt>
        <Txt size={13}>
          Sélectionnez les fichiers depuis votre dossier privé. Norya en garde une copie dans le stockage de l’application pour l’ouverture hors ligne ; aucun fichier n’est envoyé à un serveur ni inclus dans le code ou le build. Les copies restent non chiffrées sur cet appareil.
        </Txt>
        <Button
          title={busy ? "Import en cours…" : "Importer plusieurs PDF par nom"}
          icon="folder-open-outline"
          disabled={busy || !loaded}
          onPress={() => void pickMany()}
        />
      </Card>

      {officialDocuments.map((document) => (
        <Card key={document.id}>
          <Txt size={11} color={c.primary}>DOCUMENT OFFICIEL</Txt>
          <Txt bold>{document.title}</Txt>
          <Txt size={12} color={c.muted}>{document.file}</Txt>
          <DocumentActions
            document={documents[document.id]}
            busy={busy}
            onImport={() => void pickOne(document.id)}
            onOpen={() => void openPdf(document.id)}
            onRemove={() => void removePdf(document.id)}
          />
          {document.id === "errata-2021" && (
            <Txt size={12} color={c.muted}>{errataSource.status}</Txt>
          )}
        </Card>
      ))}

      <Card>
        <Txt bold size={18}>Associer les références des ouvrages</Txt>
        <Txt size={13} color={c.muted}>
          L’index conserve les titres, pages et limites exactes de la Tematica. Ajoutez les copies locales des chapitres pour les lire ici ; le nom du livre et les pages d’origine restent affichés.
        </Txt>
        {referenceBooks.map((book) => (
          <Txt key={book.id} size={12} color={c.muted}>
            {book.title} · {book.edition} · {book.year} · {book.publisher}
          </Txt>
        ))}
      </Card>

      <TextInput
        style={s.input}
        accessibilityLabel="Rechercher dans l’index de références"
        placeholder="Rechercher un chapitre, un thème ou une page…"
        value={query}
        onChangeText={setQuery}
      />
      <View style={s.wrap}>
        {[
          { id: "Tous", label: "Tous" },
          { id: "kumar", label: "Kumar" },
          { id: "lawrence", label: "Lawrence" },
          { id: "sinopsis", label: "Sinopsis" },
        ].map((filter) => (
          <Chip
            key={filter.id}
            label={filter.label}
            selected={bookFilter === filter.id}
            onPress={() => setBookFilter(filter.id)}
          />
        ))}
      </View>

      {!loaded && !loadingError && <Txt>Chargement de l’index local…</Txt>}
      {!!loadingError && (
        <Card>
          <Txt color="#9A513C">{loadingError}</Txt>
          <Button title="Réessayer" secondary onPress={() => void load()} />
        </Card>
      )}
      {filtered.map((chapter) => (
        <ChapterReference
          key={chapter.id}
          chapter={chapter}
          document={documents[chapter.id]}
          errata={errataByChapter[chapter.id]}
          errataPdfAvailable={!!documents["errata-2021"]}
          busy={busy}
          onImport={() => void pickOne(chapter.id)}
          onOpen={() => void openPdf(chapter.id)}
          onRemove={() => void removePdf(chapter.id)}
          onOpenErrata={() => void openPdf("errata-2021")}
          onImportErrata={() => void pickOne("errata-2021")}
        />
      ))}
      {!!notice && <Txt color={c.primary}>{notice}</Txt>}
      {!!error && <Txt color="#9A513C">{error}</Txt>}
    </Screen>
  );
}

function DocumentActions({
  document,
  busy,
  onImport,
  onOpen,
  onRemove,
}: {
  document?: StoredPdf;
  busy: boolean;
  onImport: () => void;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={s.wrap}>
      {document ? (
        <>
          <Button title="Ouvrir / partager" icon="document-text-outline" onPress={onOpen} />
          <Button title="Remplacer le PDF" secondary disabled={busy} onPress={onImport} />
          <Button title="Retirer l’association" secondary onPress={onRemove} />
        </>
      ) : (
        <Button title="Ajouter ce PDF privé" icon="add" disabled={busy} onPress={onImport} />
      )}
    </View>
  );
}

function ChapterReference({
  chapter,
  document,
  errata,
  errataPdfAvailable,
  busy,
  onImport,
  onOpen,
  onRemove,
  onOpenErrata,
  onImportErrata,
}: {
  chapter: ExamChapter;
  document?: StoredPdf;
  errata?: { bookPages: string; errataPdfPages: string };
  errataPdfAvailable: boolean;
  busy: boolean;
  onImport: () => void;
  onOpen: () => void;
  onRemove: () => void;
  onOpenErrata: () => void;
  onImportErrata: () => void;
}) {
  const book = referenceBooks.find((item) => item.id === chapter.bookId)!;
  return (
    <Card style={{ padding: 18 }}>
      <Txt size={11} color={c.primary}>
        {book.title.toLocaleUpperCase()} · {book.edition} · {book.year}
      </Txt>
      <Txt bold size={18}>{chapter.chapter}</Txt>
      <Txt size={13} color={c.muted}>Pages d’origine : {chapter.pages}</Txt>
      {chapter.scope.map((item) => (
        <Txt key={item} size={13}>· {item}</Txt>
      ))}
      {errata && (
        <Card style={{ backgroundColor: c.peach, padding: 14 }}>
          <Txt bold color="#9A513C">⚠ Corrigé par Errata 2021</Txt>
          <Txt size={12}>
            Références du livre : p. {errata.bookPages} · PDF Errata : p. {errata.errataPdfPages}. Vérifiez l’erratum original avant d’utiliser ces passages dans une fiche ou un exercice.
          </Txt>
          <Button
            title={errataPdfAvailable ? "Ouvrir l’Errata original" : "Importer l’Errata original"}
            secondary
            disabled={busy}
            onPress={errataPdfAvailable ? onOpenErrata : onImportErrata}
          />
        </Card>
      )}
      {document ? (
        <>
          <RowLink
            title="Référentiel privé prêt"
            subtitle={`${document.name} · importé localement`}
            icon="lock-closed-outline"
            onPress={onOpen}
          />
          <DocumentActions
            document={document}
            busy={busy}
            onImport={onImport}
            onOpen={onOpen}
            onRemove={onRemove}
          />
        </>
      ) : (
        <>
          {chapter.privateFile && (
            <Txt size={12} color={c.muted}>
              Nom présent dans votre dossier privé : {chapter.privateFile}
            </Txt>
          )}
          <DocumentActions
            busy={busy}
            onImport={onImport}
            onOpen={onOpen}
            onRemove={onRemove}
          />
        </>
      )}
    </Card>
  );
}
