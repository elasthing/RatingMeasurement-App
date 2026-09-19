import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import { CopperTrendPoint } from "@/src/api";
import { fonts, useTheme } from "@/src/theme";

const MAX_SEV = 12;
// CLEAR (pass) covers Freshly Polished / 1a / 1b -> severity 0..2.
const CLEAR_THRESHOLD = 2.5;

export function CopperTrendChart({
  data,
  width,
  height = 220,
}: {
  data: CopperTrendPoint[];
  width: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const padL = 28;
  const padR = 12;
  const padT = 16;
  const padB = 24;
  const chartW = Math.max(1, width - padL - padR);
  const chartH = height - padT - padB;

  const n = data.length;
  const x = (i: number) => padL + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  // Worse (higher severity) plotted lower.
  const y = (s: number) => padT + (s / MAX_SEV) * chartH;

  const points = data.map((d, i) => `${x(i)},${y(d.severity)}`).join(" ");
  const gridVals = [0, 3, 6, 9, 12];

  return (
    <View testID="copper-trend-chart">
      <Svg width={width} height={height}>
        {gridVals.map((g) => (
          <Line key={g} x1={padL} y1={y(g)} x2={width - padR} y2={y(g)} stroke={colors.divider} strokeWidth={1} />
        ))}
        {gridVals.map((g) => (
          <SvgText key={`t${g}`} x={4} y={y(g) + 4} fill={colors.muted} fontSize={9} fontFamily={fonts.mono}>
            {g}
          </SvgText>
        ))}
        <Line
          x1={padL}
          y1={y(CLEAR_THRESHOLD)}
          x2={width - padR}
          y2={y(CLEAR_THRESHOLD)}
          stroke={colors.success}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        {n > 1 && <Polyline points={points} fill="none" stroke={colors.brandSecondary} strokeWidth={2.5} />}
        {data.map((d, i) => (
          <Circle
            key={i}
            cx={x(i)}
            cy={y(d.severity)}
            r={4}
            fill={d.status === "TARNISH" ? colors.error : colors.success}
            stroke={colors.surface}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
      <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.success, marginTop: 4 }}>
        - - - CLEAR threshold (≤ 1b) · sumbu Y = tingkat korosi (0 terbaik → 12 terburuk)
      </Text>
    </View>
  );
}
