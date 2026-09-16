import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import { fonts, ratingColor, useTheme } from "@/src/theme";

export type TrendPoint = { rating: number; sample_id: string };

export function TrendChart({ data, width, height = 220 }: { data: TrendPoint[]; width: number; height?: number }) {
  const { colors } = useTheme();
  const padL = 28;
  const padR = 12;
  const padT = 16;
  const padB = 24;
  const chartW = Math.max(1, width - padL - padR);
  const chartH = height - padT - padB;

  const n = data.length;
  const maxR = 10;
  const x = (i: number) => padL + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const y = (r: number) => padT + (1 - r / maxR) * chartH;

  const points = data.map((d, i) => `${x(i)},${y(d.rating)}`).join(" ");
  const gridVals = [0, 2.5, 5, 7.5, 10];

  return (
    <View testID="trend-chart">
      <Svg width={width} height={height}>
        {gridVals.map((g) => (
          <Line key={g} x1={padL} y1={y(g)} x2={width - padR} y2={y(g)} stroke={colors.divider} strokeWidth={1} />
        ))}
        {gridVals.map((g) => (
          <SvgText key={`t${g}`} x={4} y={y(g) + 4} fill={colors.muted} fontSize={9} fontFamily={fonts.mono}>
            {g}
          </SvgText>
        ))}
        {/* pass threshold at 7 */}
        <Line
          x1={padL}
          y1={y(7)}
          x2={width - padR}
          y2={y(7)}
          stroke={colors.success}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        {n > 1 && <Polyline points={points} fill="none" stroke={colors.brandPrimary} strokeWidth={2.5} />}
        {data.map((d, i) => (
          <Circle key={i} cx={x(i)} cy={y(d.rating)} r={4} fill={ratingColor(d.rating)} stroke={colors.surface} strokeWidth={1.5} />
        ))}
      </Svg>
      <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.success, marginTop: 4 }}>
        - - - CLEAR threshold (7.0)
      </Text>
    </View>
  );
}
