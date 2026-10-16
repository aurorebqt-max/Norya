import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button, Txt } from './ui';
import { CourseTable } from './CourseBlocks';
import { colors as c } from '../design/theme';
import {
  addColumn, addRow, columnCount, createTable, removeColumn, removeRow, rowRole, setCellHeader, setCellSpan, setCellText, setRowRole,
  type BlockTable,
} from '../domain/sourceCourse/classification';
import { detectTableFromPart } from '../domain/sourceCourse/tableDetection';
import type { SourcePart } from '../domain/sourceCourse/packet';

/**
 * Éditeur de tableau : grille de cellules texte, lignes/colonnes, fusions de cellules, titre et notes.
 * Il ne modifie que le brouillon ; l'enregistrement et la validation passent par les fonctions de domaine.
 */
export function TableEditor({ initial, sourcePart, busy, onSave, onCancel }: {
  initial?: BlockTable; sourcePart: SourcePart; busy?: boolean;
  onSave: (table: BlockTable) => void; onCancel: () => void;
}) {
  const detection = useMemo(() => detectTableFromPart(sourcePart), [sourcePart]);
  const [table, setTable] = useState<BlockTable>(initial ?? detection.table ?? createTable());
  const [showDetection, setShowDetection] = useState(!initial && !!detection.table);
  const [at, setAt] = useState<[number, number]>([0, 0]);
  const [selection, setSelection] = useState<'cell' | 'row' | 'column' | 'range'>('cell');
  const [mergeCells, setMergeCells] = useState<string[]>([]);
  const [error, setError] = useState('');
  const apply = (change: () => BlockTable) => {
    try { setTable(change()); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  };
  const [r, col] = at;
  const here = table.rows[r]?.[col];
  const cellKey = (row: number, column: number) => `${row}:${column}`;
  const mergeSelection = () => {
    const selected = mergeCells.map(value => value.split(':').map(Number) as [number, number]);
    if (selected.length < 2) throw new Error('Sélectionnez au moins deux cellules à fusionner.');
    const rows = selected.map(([row]) => row);
    const columns = selected.map(([, column]) => column);
    const startRow = Math.min(...rows); const endRow = Math.max(...rows);
    const startColumn = Math.min(...columns); const endColumn = Math.max(...columns);
    const expected = (endRow - startRow + 1) * (endColumn - startColumn + 1);
    if (selected.length !== expected) throw new Error('Sélectionnez un rectangle complet de cellules.');
    const next = setCellSpan(table, startRow, startColumn, endRow - startRow + 1, endColumn - startColumn + 1);
    setAt([startRow, startColumn]); setMergeCells([]); setSelection('cell');
    return next;
  };
  const toggleMergeCell = (row: number, column: number) => {
    const key = cellKey(row, column);
    setMergeCells(current => current.includes(key) ? current.filter(value => value !== key) : [...current, key]);
  };
  const tool = (title: string, change: () => BlockTable) => <Button key={title} title={title} secondary onPress={() => apply(change)} />;
  const applyDetection = () => {
    if (!detection.table) return;
    setTable(current => ({
      ...detection.table!,
      detectionHistory: [...(current.detectionHistory ?? []), ...(current.detection ? [current.detection] : [])],
    }));
    setShowDetection(false);
    setError('');
  };
  return <View style={{ gap: 8, marginTop: 12 }}>
    <Txt size={13} bold>Tableau numérique</Txt>
    <Txt size={12} color={c.muted}>Reprenez exactement les valeurs, unités, abréviations et symboles du PDF. Une cellule illisible reste vide : aucune valeur n’est devinée.</Txt>
    <View style={{ gap: 5, padding: 8, borderRadius: 8, backgroundColor: c.mint }}>
      <Txt size={12} bold>{detection.table ? 'Proposition automatique à vérifier' : 'Aucune grille automatique fiable'}</Txt>
      {detection.detection.warnings.map(warning => <Txt key={warning} size={12} color={c.muted}>⚠ {warning}</Txt>)}
      {detection.table && initial && !showDetection && <Button title="Relancer la détection du tableau" secondary onPress={() => setShowDetection(true)} />}
      {showDetection && detection.table && <View style={{ gap: 6 }}>
        <Txt size={12} color={c.muted}>Aperçu de la nouvelle proposition ; le tableau actuel reste inchangé tant que vous ne l’appliquez pas.</Txt>
        <CourseTable table={detection.table} />
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Button title="Utiliser cette proposition" secondary onPress={applyDetection} />
          {!!initial && <Button title="Conserver mon tableau actuel" secondary onPress={() => setShowDetection(false)} />}
        </View>
      </View>}
    </View>
    <TextInput value={table.title ?? ''} onChangeText={t => setTable({ ...table, title: t })} placeholder="Titre / légende du tableau (facultatif)"
      accessibilityLabel="Titre du tableau" style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 8, color: c.ink, backgroundColor: c.paper }} />
    <View style={{ gap: 6, padding: 8, borderWidth: 1, borderColor: c.line, borderRadius: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {selection === 'row' && <>
          {tool('Ajouter au-dessus', () => addRow(table, r))}
          {tool('Ajouter en dessous', () => addRow(table, r + 1))}
          {tool('Supprimer la ligne', () => removeRow(table, r))}
          {tool('Ligne normale', () => setRowRole(table, r, 'normal'))}
          {tool('En-tête de colonnes', () => setRowRole(table, r, 'header'))}
          {tool('Ligne de catégorie', () => setRowRole(table, r, 'category'))}
        </>}
        {selection === 'column' && <>
          {tool('Ajouter à gauche', () => addColumn(table, col))}
          {tool('Ajouter à droite', () => addColumn(table, col + 1))}
          {tool('Supprimer la colonne', () => removeColumn(table, col))}
        </>}
        {selection === 'cell' && <>
          {tool(here?.header ? 'Retirer en-tête cellule' : 'Marquer cellule en-tête', () => setCellHeader(table, r, col, !here?.header))}
          {tool('Fusionner vers la droite', () => setCellSpan(table, r, col, here?.rowSpan ?? 1, (here?.colSpan ?? 1) + 1))}
          {tool('Fusionner vers le bas', () => setCellSpan(table, r, col, (here?.rowSpan ?? 1) + 1, here?.colSpan ?? 1))}
          {tool('Défusionner', () => setCellSpan(table, r, col, 1, 1))}
        </>}
        {selection === 'range' && <>
          <Button title={`Fusionner la sélection (${mergeCells.length})`} secondary disabled={mergeCells.length < 2} onPress={() => apply(mergeSelection)} />
          <Button title="Annuler la sélection" secondary onPress={() => { setMergeCells([]); setSelection('cell'); }} />
        </>}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <Txt size={12} color={c.muted}>{selection === 'row' ? `Ligne ${r + 1} · ${rowRole(table, r)}` : selection === 'column' ? `Colonne ${col + 1}` : selection === 'range' ? 'Touchez les cases des cellules à réunir.' : `Cellule ${r + 1},${col + 1}`}</Txt>
        {selection !== 'range' && <Button title="Sélectionner des cellules à fusionner" secondary onPress={() => { setMergeCells([]); setSelection('range'); }} />}
      </View>
      <ScrollView horizontal><View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 4, paddingLeft: 42 }}>
        {Array.from({ length: columnCount(table) }, (_, ci) => <Pressable key={ci} accessibilityRole="button" accessibilityLabel={`Sélectionner colonne ${ci + 1}`}
          onPress={() => { setAt([r, ci]); setSelection('column'); }} style={{ minWidth: 44, minHeight: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: selection === 'column' && col === ci ? c.mint : c.paper, borderRadius: 6 }}>
          <Txt bold>+ {ci + 1}</Txt>
        </Pressable>)}
      </View>
      {table.rows.map((row, ri) => <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Sélectionner ligne ${ri + 1}`} onPress={() => { setAt([ri, col]); setSelection('row'); }}
          style={{ width: 38, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 6, backgroundColor: selection === 'row' && r === ri ? c.mint : c.paper }}>
          <Txt bold>+ {ri + 1}</Txt>
        </Pressable>
        {row.map((cell, ci) => <View key={ci} style={{ position: 'relative' }}>
          <TextInput multiline value={cell.text} accessibilityLabel={`Cellule ${ri + 1},${ci + 1}`}
          editable={!cell.covered} onFocus={() => { setAt([ri, ci]); if (selection !== 'range') setSelection('cell'); }}
          onChangeText={t => apply(() => setCellText(table, ri, ci, t))}
          style={{ width: 130 * (cell.colSpan ?? 1), minHeight: 40, borderWidth: ri === r && ci === col ? 2 : 1,
            borderColor: ri === r && ci === col ? c.primary : c.line, borderRadius: 6, padding: 6, color: cell.covered ? c.muted : c.ink,
            backgroundColor: cell.covered ? c.mint : c.paper, opacity: cell.covered ? 0.5 : 1 }} />
          {selection === 'range' && !cell.covered && <Pressable accessibilityRole="checkbox" accessibilityLabel={`Sélectionner cellule ${ri + 1},${ci + 1} pour fusion`}
            accessibilityState={{ checked: mergeCells.includes(cellKey(ri, ci)) }} onPress={() => toggleMergeCell(ri, ci)}
            style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
              backgroundColor: mergeCells.includes(cellKey(ri, ci)) ? c.primary : c.paper, borderWidth: 1, borderColor: c.line }}>
            <Txt bold color={mergeCells.includes(cellKey(ri, ci)) ? c.paper : c.muted}>{mergeCells.includes(cellKey(ri, ci)) ? '✓' : '○'}</Txt>
          </Pressable>}
        </View>)}
      </View>)}
    </View></ScrollView></View>
    <TextInput multiline value={table.notes ?? ''} onChangeText={t => setTable({ ...table, notes: t })}
      placeholder="Notes, légende, unités, symboles (facultatif)" accessibilityLabel="Notes du tableau"
      style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 8, minHeight: 60, color: c.ink, backgroundColor: c.paper }} />
    {!!error && <Txt size={12} color="#dc3545">{error}</Txt>}
    <Txt size={13} bold>Aperçu ({table.rows.length} lignes × {columnCount(table)} colonnes)</Txt>
    <CourseTable table={table} />
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Button title="Enregistrer le tableau" disabled={busy} onPress={() => onSave(table)} />
      <Button title="Annuler" secondary onPress={onCancel} />
    </View>
  </View>;
}
