import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { theme } from '../theme';

export type ExerciseLoadChartPoint = {
  date: string;
  load: number;
};

type ExerciseLoadChartProps = {
  pointList: ExerciseLoadChartPoint[];
};

const CHART_HEIGHT = 180;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 26;
const CHART_PADDING_HORIZONTAL = 12;
const AXIS_STROKE_WIDTH = 1;
const LINE_STROKE_WIDTH = 2;

function formatAxisDate(dateValue: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(dateValue));
}

function buildLinePath(
  pointList: ExerciseLoadChartPoint[],
  chartWidth: number,
  chartHeight: number
): string {
  if (pointList.length === 0) {
    return '';
  }

  const usableWidth = chartWidth - CHART_PADDING_HORIZONTAL * 2;
  const usableHeight = chartHeight - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  const loadValueList = pointList.map((point) => point.load);
  const minLoad = Math.min(...loadValueList);
  const maxLoad = Math.max(...loadValueList);
  const loadRange = Math.max(maxLoad - minLoad, 1);

  return pointList
    .map((point, pointIndex) => {
      const horizontalProgress =
        pointList.length === 1 ? 0.5 : pointIndex / (pointList.length - 1);

      const xPosition = CHART_PADDING_HORIZONTAL + horizontalProgress * usableWidth;
      const normalizedLoad = (point.load - minLoad) / loadRange;
      const yPosition = CHART_PADDING_TOP + (1 - normalizedLoad) * usableHeight;

      return `${pointIndex === 0 ? 'M' : 'L'} ${xPosition} ${yPosition}`;
    })
    .join(' ');
}

export function ExerciseLoadChart({ pointList }: ExerciseLoadChartProps) {
  if (pointList.length < 2) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateText}>Poucos registros para exibir gráfico</Text>
      </View>
    );
  }

  const chartWidth = 320;
  const axisBottomY = CHART_HEIGHT - CHART_PADDING_BOTTOM;
  const pathValue = buildLinePath(pointList, chartWidth, CHART_HEIGHT);
  const firstPointDateLabel = formatAxisDate(pointList[0].date);
  const lastPointDateLabel = formatAxisDate(pointList[pointList.length - 1].date);

  return (
    <View style={styles.container}>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}>
        <Line
          x1={CHART_PADDING_HORIZONTAL}
          y1={axisBottomY}
          x2={chartWidth - CHART_PADDING_HORIZONTAL}
          y2={axisBottomY}
          stroke={theme.colors.border}
          strokeWidth={AXIS_STROKE_WIDTH}
        />
        <Path
          d={pathValue}
          stroke={theme.colors.primary}
          strokeWidth={LINE_STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      <View style={styles.axisLabelContainer}>
        <Text style={styles.axisLabelText}>{firstPointDateLabel}</Text>
        <Text style={styles.axisLabelText}>{lastPointDateLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm
  },
  axisLabelContainer: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  axisLabelText: {
    color: theme.colors.textSecondary,
    fontSize: 12
  },
  emptyStateContainer: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 13
  }
});
