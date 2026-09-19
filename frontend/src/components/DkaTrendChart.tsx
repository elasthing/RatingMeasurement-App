import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import { DkaTrendPoint } from "@/src/api";
import { fonts, useTheme } from "@/src/theme";

const MAX_SEV = 3;

export function DkaTrendChart({ data, width, height = 200 }: { data: DkaTrendPoint[]; width: number; height?: number }) {
  const { colors } = useTheme();
  const padL = 28;
  const padR = 12;
  const padT = 16;
  const padB = 24;
  const chartW = Math.max(1, width - padL - padR);
  const chartH = height - padT - padB;

  const n = data.length;
  const x = (i: number) => padL + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const y = (s: number) => padT + (s / MAX_SEV) * chartH;

  const points = data.map((d, i) => `${x(i)},${y(d.avg_severity)}`).join(" ");
  const gridVals = [0, 1, 2, 3];
  const labels = ["CLEAR", "Asp1", "Asp2", "Asp3"];

  return (
    <View testID="dka-trend-chart">
      <Svg width={width} height={height}>
        {gridVals.map((g) => (
          <Line key={g} x1={padL} y1={y(g)} x2={width - padR} y2={y(g)} stroke={colors.divider} strokeWidth={1} />
        ))}
        {gridVals.map((g, i) => (
          <SvgText key={`t${g}`} x={2} y={y(g) + 4} fill={colors.muted} fontSize={8} fontFamily={fonts.mono}>
            {labels[i]}
          </SvgText>
        ))}
        {n > 1 && <Polyline points={points} fill="none" stroke={colors.info} strokeWidth={2.5} />}
        {data.map((d, i) => (
          <Circle key={i} cx={x(i)} cy={y(d.avg_severity)} r={4} fill={colors.info} stroke={colors.surface} strokeWidth={1.5} />
        ))}
      </Svg>
      <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, marginTop: 4 }}>
        Rata-rata severity per batch (0 = CLEAR terbaik → 3 = Aspect 3 terburuk)
      </Text>
    </View>
  );
}
