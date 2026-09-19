import { Image } from "expo-image";
import { Text, View } from "react-native";

import { DkaSample, fileUrl } from "@/src/api";
import { DkaBadge } from "@/src/components/DkaBadge";
import { fonts, makeStyles, radius, spacing } from "@/src/theme";

export function DkaSampleCard({ sample }: { sample: DkaSample }) {
  const styles = useStyles();
  return (
    <View style={styles.card} testID={`dka-sample-${sample.index}`}>
      <Image
        source={{ uri: fileUrl(sample.crop_path || "") }}
        style={styles.crop}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.body}>
        <Text style={styles.idx}>#{sample.index}</Text>
        <Text style={styles.sid} numberOfLines={1}>
          {sample.sample_id || "—"}
        </Text>
        <View style={{ marginTop: 4 }}>
          <DkaBadge rating={sample.rating} color={sample.color} size="sm" />
        </View>
        <Text style={styles.conf}>Conf {sample.confidence.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  crop: { width: "100%", height: 150, backgroundColor: c.surfaceTertiary },
  body: { padding: spacing.md, gap: 2 },
  idx: { fontFamily: fonts.mono, fontSize: 9, color: c.info, letterSpacing: 1 },
  sid: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface },
  conf: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, marginTop: 4 },
}));
