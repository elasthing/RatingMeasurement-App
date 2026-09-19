import { ScrollView, Text, Pressable } from "react-native";

import { CopperClass, useCopperScale } from "@/src/api";
import { fonts, makeStyles, radius, spacing } from "@/src/theme";

function textOn(color: string): string {
  const h = color.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0A1420" : "#FFFFFF";
}

// A fallback list of classes (also served by the backend) so the picker still
// renders while the scale query loads.
const FALLBACK: CopperClass[] = [
  { code: "0", label: "Freshly Polished", group: "Freshly Polished", color: "#E8955A", description: "", severity: 0, status: "CLEAR" },
  { code: "1a", label: "Slight Tarnish", group: "Slight Tarnish", color: "#EFB07A", description: "", severity: 1, status: "CLEAR" },
  { code: "1b", label: "Slight Tarnish", group: "Slight Tarnish", color: "#D6822F", description: "", severity: 2, status: "CLEAR" },
  { code: "2a", label: "Moderate Tarnish", group: "Moderate Tarnish", color: "#A83B4B", description: "", severity: 3, status: "TARNISH" },
  { code: "2b", label: "Moderate Tarnish", group: "Moderate Tarnish", color: "#B98FBE", description: "", severity: 4, status: "TARNISH" },
  { code: "2c", label: "Moderate Tarnish", group: "Moderate Tarnish", color: "#9C6FA6", description: "", severity: 5, status: "TARNISH" },
  { code: "2d", label: "Moderate Tarnish", group: "Moderate Tarnish", color: "#BFBFBF", description: "", severity: 6, status: "TARNISH" },
  { code: "3a", label: "Moderate Tarnish", group: "Moderate Tarnish", color: "#9C3A6B", description: "", severity: 7, status: "TARNISH" },
  { code: "3b", label: "Dark Tarnish", group: "Dark Tarnish", color: "#3E7D6B", description: "", severity: 8, status: "TARNISH" },
  { code: "3c", label: "Dark Tarnish", group: "Dark Tarnish", color: "#2E5A4E", description: "", severity: 9, status: "TARNISH" },
  { code: "4a", label: "Corrosion", group: "Corrosion", color: "#4A4A4A", description: "", severity: 10, status: "TARNISH" },
  { code: "4b", label: "Corrosion", group: "Corrosion", color: "#2B2B2B", description: "", severity: 11, status: "TARNISH" },
  { code: "4c", label: "Corrosion", group: "Corrosion", color: "#141414", description: "", severity: 12, status: "TARNISH" },
];

export function CopperClassPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const { data } = useCopperScale();
  const classes = data?.classes?.length ? data.classes : FALLBACK;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {classes.map((c) => {
        const active = c.code === value;
        return (
          <Pressable
            key={c.code}
            testID={`copper-class-${c.code}`}
            disabled={disabled}
            onPress={() => onChange(c.code)}
            style={[styles.chip, { backgroundColor: c.color }, active && styles.chipActive, disabled && { opacity: 0.5 }]}
          >
            <Text style={[styles.chipText, { color: textOn(c.color) }]}>{c.code.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  row: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  chip: {
    minWidth: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    paddingHorizontal: spacing.sm,
  },
  chipActive: { borderColor: c.onSurface },
  chipText: { fontFamily: fonts.display, fontSize: 20 },
}));
