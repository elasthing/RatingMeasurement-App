import { useRouter } from "expo-router";
import { Check, CheckSquare, Export, MagnifyingGlass, Square, X } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CopperRecord, statusLabel, useCopperTests } from "@/src/api";
import { CopperHistoryCard } from "@/src/components/CopperHistoryCard";
import { Header } from "@/src/components/Header";
import { useToast } from "@/src/components/Toast";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { buildCopperCombinedHtml, printHtmlOnWeb, sharePdfNative } from "@/src/utils/copper-pdf";

type Filter = "all" | "clear" | "tarnish";
const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Clear", value: "clear" },
  { label: "Tarnish", value: "tarnish" },
];

export default function CopperHistory() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, refetch, isRefetching } = useCopperTests(q);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => {
    const list = data ?? [];
    if (filter === "all") return list;
    return list.filter((t) => (statusLabel(t.status) === "CLEAR") === (filter === "clear"));
  }, [data, filter]);

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
      toast("Pilih minimal 1 sample.", "info");
      return;
    }
    setExporting(true);
    try {
      const selected: CopperRecord[] = rows.filter((t) => selectedIds.has(t.id));
      if (selected.length === 0) {
        toast("Sample terpilih tidak ada di daftar aktif.", "error");
        return;
      }
      const html = await buildCopperCombinedHtml(selected);
      if (Platform.OS === "web") {
        printHtmlOnWeb(html);
        toast(`Menyiapkan PDF gabungan (${selected.length} sample).`, "success");
      } else {
        const stamp = new Date().toISOString().slice(0, 10);
        const shared = await sharePdfNative(
          html,
          `CopperStrip_Combined_${selected.length}samples_${stamp}`,
          `Copper Strip Combined Report (${selected.length} sample)`,
        );
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
        subtitle={selectionMode ? `${selectedCount} dipilih` : "Copper strip records"}
        logo="CU"
        showBack={!selectionMode}
        right={
          selectionMode ? (
            <Pressable style={styles.hIcon} onPress={exitSelection} testID="copper-selection-cancel">
              <X size={20} color={colors.onSurface} weight="bold" />
            </Pressable>
          ) : (
            <Pressable style={styles.hIcon} onPress={() => enterSelection()} testID="copper-selection-enter">
              <CheckSquare size={20} color={colors.brandSecondary} weight="bold" />
            </Pressable>
          )
        }
      />

      <View style={styles.toolbar}>
        <View style={styles.search}>
          <MagnifyingGlass size={16} color={colors.muted} />
          <TextInput
            testID="copper-search"
            value={q}
            onChangeText={setQ}
            placeholder="Cari sample, product, batch, operator"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroll}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <Pressable key={f.value} testID={`copper-filter-${f.value}`} onPress={() => setFilter(f.value)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
          {selectionMode && rows.length > 0 && (
            <Pressable testID="copper-select-all" onPress={toggleSelectAll} style={[styles.chip, styles.chipSelectAll, allSelected && styles.chipActive]}>
              {allSelected ? <Check size={12} color={colors.onBrandSecondary} weight="bold" /> : <Square size={12} color={colors.brandSecondary} weight="bold" />}
              <Text style={[styles.chipText, allSelected && styles.chipTextActive]}>{allSelected ? "Batalkan Pilih Semua" : "Pilih Semua"}</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandSecondary} />
        </View>
      ) : (
        <FlatList<CopperRecord>
          data={rows}
          keyExtractor={(t) => t.id}
          contentContainerStyle={[styles.list, selectionMode && { paddingBottom: insets.bottom + 96 + spacing.xxl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandSecondary} />}
          renderItem={({ item }) => (
            <CopperHistoryCard
              test={item}
              onPress={() => router.push(`/copper-result/${item.id}`)}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleOne(item.id)}
              onLongPress={() => enterSelection(item.id)}
            />
          )}
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
              <Text style={styles.actionCount}>{selectedCount} SAMPLE DIPILIH</Text>
              <Text style={styles.actionHint}>Gabung menjadi 1 file PDF (cover + per halaman)</Text>
            </View>
            <Pressable
              testID="copper-export-combined"
              style={[styles.exportBtn, (selectedCount === 0 || exporting) && styles.exportBtnDisabled]}
              onPress={exportCombined}
              disabled={selectedCount === 0 || exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.onBrandSecondary} />
              ) : (
                <Export size={16} color={colors.onBrandSecondary} weight="bold" />
              )}
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
  chipScroll: { marginTop: spacing.md },
  chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: { height: 36, flexShrink: 0, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  chipActive: { backgroundColor: c.brandSecondary, borderColor: c.brandSecondary },
  chipSelectAll: { borderColor: c.brandSecondary },
  chipText: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurfaceTertiary },
  chipTextActive: { color: c.onBrandSecondary, fontFamily: fonts.monoBold },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, width: "100%", maxWidth: 760, alignSelf: "center" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  dim: { fontFamily: fonts.mono, fontSize: 12, color: c.muted },
  actionBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  actionInner: { flexDirection: "row", alignItems: "center", gap: spacing.md, width: "100%", maxWidth: 760, alignSelf: "center" },
  actionCount: { fontFamily: fonts.monoBold, fontSize: 12, color: c.brandSecondary, letterSpacing: 1 },
  actionHint: { fontFamily: fonts.mono, fontSize: 10, color: c.onSurfaceTertiary, marginTop: 2 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.brandSecondary, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 46 },
  exportBtnDisabled: { opacity: 0.5 },
  exportText: { fontFamily: fonts.monoBold, fontSize: 12, color: c.onBrandSecondary, letterSpacing: 1 },
}));
