import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Check, CheckSquare, Export, MagnifyingGlass, Square, X } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DkaRecord, fileUrl, useDkaTests } from "@/src/api";
import { DkaBadge } from "@/src/components/DkaBadge";
import { Header } from "@/src/components/Header";
import { useToast } from "@/src/components/Toast";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDate } from "@/src/utils/format";
import { buildDkaCombinedHtml, printHtmlOnWeb, sharePdfNative } from "@/src/utils/dka-pdf";

export default function DkaHistory() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const { data, isLoading, refetch, isRefetching } = useDkaTests(q);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => data ?? [], [data]);

  const enterSelection = useCallback((initialId?: string) => {
    setSelectionMode(true);
    if (initialId) setSelectedIds(new Set([initialId]));
  }, []);
  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);
  const toggleOne = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const allSelected = rows.length > 0 && rows.every((t) => selectedIds.has(t.id));
  const toggleSelectAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map((t) => t.id)));
  }, [allSelected, rows]);

  async function exportCombined() {
    if (selectedIds.size === 0) {
      toast("Pilih minimal 1 batch.", "info");
      return;
    }
    setExporting(true);
    try {
      const selected: DkaRecord[] = rows.filter((t) => selectedIds.has(t.id));
      const html = await buildDkaCombinedHtml(selected);
      if (Platform.OS === "web") {
        printHtmlOnWeb(html);
        toast(`Menyiapkan PDF (${selected.length} batch).`, "success");
      } else {
        const stamp = new Date().toISOString().slice(0, 10);
        const shared = await sharePdfNative(html, `DKA_Combined_${selected.length}batches_${stamp}`, `DKA Combined Report (${selected.length} batch)`);
        if (!shared) toast("PDF berhasil dibuat.", "success");
      }
      exitSelection();
    } catch (e: any) {
      toast(e?.message ? String(e.message).slice(0, 120) : "Gagal export PDF.", "error");
    } finally {
      setExporting(false);
    }
  }

  const selectedCount = selectedIds.size;

  return (
    <View style={styles.screen}>
      <Header
        title="History & Data"
        subtitle={selectionMode ? `${selectedCount} dipilih` : "DKA batch records"}
        logo="DKA"
        showBack={!selectionMode}
        right={
          selectionMode ? (
            <Pressable style={styles.hIcon} onPress={exitSelection} testID="dka-selection-cancel">
              <X size={20} color={colors.onSurface} weight="bold" />
            </Pressable>
          ) : (
            <Pressable style={styles.hIcon} onPress={() => enterSelection()} testID="dka-selection-enter">
              <CheckSquare size={20} color={colors.info} weight="bold" />
            </Pressable>
          )
        }
      />

      <View style={styles.toolbar}>
        <View style={styles.search}>
          <MagnifyingGlass size={16} color={colors.muted} />
          <TextInput testID="dka-search" value={q} onChangeText={setQ} placeholder="Cari batch, product, operator, sample" placeholderTextColor={colors.muted} style={styles.searchInput} />
        </View>
        {selectionMode && rows.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={{ marginTop: spacing.md }}>
            <Pressable testID="dka-select-all" onPress={toggleSelectAll} style={[styles.chip, allSelected && styles.chipActive]}>
              {allSelected ? <Check size={12} color={colors.onInfo} weight="bold" /> : <Square size={12} color={colors.info} weight="bold" />}
              <Text style={[styles.chipText, allSelected && styles.chipTextActive]}>{allSelected ? "Batalkan Pilih Semua" : "Pilih Semua"}</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.info} />
        </View>
      ) : (
        <FlatList<DkaRecord>
          data={rows}
          keyExtractor={(t) => t.id}
          contentContainerStyle={[styles.list, selectionMode && { paddingBottom: insets.bottom + 96 + spacing.xxl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.info} />}
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id);
            return (
              <Pressable
                style={[styles.row, selectionMode && selected && styles.rowSelected]}
                onPress={() => (selectionMode ? toggleOne(item.id) : router.push(`/dka-result/${item.id}`))}
                onLongPress={() => enterSelection(item.id)}
                delayLongPress={280}
                testID={`dka-card-${item.id}`}
              >
                <Pressable onPress={() => toggleOne(item.id)} hitSlop={12} style={[styles.checkbox, selected && styles.checkboxOn]} testID={`dka-check-${item.id}`}>
                  {selected ? <Check size={14} color={colors.onInfo} weight="bold" /> : null}
                </Pressable>
                <Image source={{ uri: fileUrl(item.image_path || item.samples[0]?.crop_path || "") }} style={styles.thumb} contentFit="cover" transition={200} />
                <View style={styles.mid}>
                  <Text style={styles.sample} numberOfLines={1}>{item.meta.batch_id || item.id.slice(0, 8)}</Text>
                  <Text style={styles.oil} numberOfLines={1}>{item.meta.product || "—"} · {item.samples.length} sampel</Text>
                  <Text style={styles.date}>{fmtDate(item.created_at)}</Text>
                </View>
                <View style={styles.badges}>
                  {item.samples.slice(0, 4).map((s) => (
                    <DkaBadge key={s.index} rating={s.rating} color={s.color} size="sm" />
                  ))}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.dim}>Belum ada data.</Text>
            </View>
          }
        />
      )}

      {selectionMode && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.actionInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCount}>{selectedCount} BATCH DIPILIH</Text>
              <Text style={styles.actionHint}>Gabung jadi 1 PDF (1 halaman/batch, tabel ringkasan)</Text>
            </View>
            <Pressable testID="dka-export-combined" style={[styles.exportBtn, (selectedCount === 0 || exporting) && styles.exportBtnDisabled]} onPress={exportCombined} disabled={selectedCount === 0 || exporting}>
              {exporting ? <ActivityIndicator size="small" color={colors.onInfo} /> : <Export size={16} color={colors.onInfo} weight="bold" />}
              <Text style={styles.exportText}>{exporting ? "MENYIAPKAN…" : "EXPORT PDF"}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  hIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  toolbar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, height: 44 },
  searchInput: { flex: 1, fontFamily: fonts.mono, fontSize: 13, color: c.onSurface, paddingVertical: 0 },
  chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: { height: 36, flexShrink: 0, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.info, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  chipActive: { backgroundColor: c.info, borderColor: c.info },
  chipText: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurfaceTertiary },
  chipTextActive: { color: c.onInfo, fontFamily: fonts.monoBold },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, width: "100%", maxWidth: 760, alignSelf: "center" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  dim: { fontFamily: fonts.mono, fontSize: 12, color: c.muted },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.sm, marginHorizontal: -spacing.sm, borderRadius: radius.md, borderBottomWidth: 1, borderBottomColor: c.divider, gap: spacing.md },
  rowSelected: { backgroundColor: "#122A4A", borderBottomColor: c.info },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.borderStrong, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: c.info, borderColor: c.info },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: c.surfaceTertiary },
  mid: { flex: 1 },
  sample: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface },
  oil: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, marginTop: 2 },
  date: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, marginTop: 2 },
  badges: { alignItems: "flex-end", gap: 3, maxWidth: 96, flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end" },
  actionBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  actionInner: { flexDirection: "row", alignItems: "center", gap: spacing.md, width: "100%", maxWidth: 760, alignSelf: "center" },
  actionCount: { fontFamily: fonts.monoBold, fontSize: 12, color: c.info, letterSpacing: 1 },
  actionHint: { fontFamily: fonts.mono, fontSize: 10, color: c.onSurfaceTertiary, marginTop: 2 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.info, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 46 },
  exportBtnDisabled: { opacity: 0.5 },
  exportText: { fontFamily: fonts.monoBold, fontSize: 12, color: c.onInfo, letterSpacing: 1 },
}));
