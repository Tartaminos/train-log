import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { theme } from '../theme';

export type ExerciseLoadChartPoint = {
  date: string;
  load: number;
};

type ExerciseLoadChartProps = {
  pointList: ExerciseLoadChartPoint[];
};

const CHART_HEIGHT = 220;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 34;
const CHART_PADDING_LEFT = 44;
const CHART_PADDING_RIGHT = 12;
const AXIS_STROKE_WIDTH = 1;
const LINE_STROKE_WIDTH = 2;
const Y_TICK_COUNT = 4;
const X_LABEL_COUNT = 3;

function formatAxisDate(dateValue: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(dateValue));
}

function formatLoadTick(loadValue: number): string {
  return loadValue.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(loadValue) ? 0 : 1
  });
}

type ChartScale = {
  minLoad: number;
  maxLoad: number;
  loadRange: number;
  usableWidth: number;
  usableHeight: number;
};

function createChartScale(pointList: ExerciseLoadChartPoint[], chartWidth: number, chartHeight: number): ChartScale {
  const loadValueList = pointList.map((point) => point.load);
  const rawMinLoad = Math.min(...loadValueList);
  const rawMaxLoad = Math.max(...loadValueList);

  if (rawMinLoad === rawMaxLoad) {
    const paddedMinLoad = Math.max(0, rawMinLoad - 5);
    const paddedMaxLoad = rawMaxLoad + 5;

    return {
      minLoad: paddedMinLoad,
      maxLoad: paddedMaxLoad,
      loadRange: paddedMaxLoad - paddedMinLoad,
      usableWidth: chartWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT,
      usableHeight: chartHeight - CHART_PADDING_TOP - CHART_PADDING_BOTTOM
    };
  }

  return {
    minLoad: rawMinLoad,
    maxLoad: rawMaxLoad,
    loadRange: rawMaxLoad - rawMinLoad,
    usableWidth: chartWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT,
    usableHeight: chartHeight - CHART_PADDING_TOP - CHART_PADDING_BOTTOM
  };
}

function calculatePointPosition(
  pointIndex: number,
  pointLoad: number,
  pointCount: number,
  chartScale: ChartScale
): { xPosition: number; yPosition: number } {
  const horizontalProgress = pointCount === 1 ? 0.5 : pointIndex / (pointCount - 1);
  const xPosition = CHART_PADDING_LEFT + horizontalProgress * chartScale.usableWidth;
  const normalizedLoad = (pointLoad - chartScale.minLoad) / chartScale.loadRange;
  const yPosition = CHART_PADDING_TOP + (1 - normalizedLoad) * chartScale.usableHeight;

  return { xPosition, yPosition };
}

function buildLinePath(pointList: ExerciseLoadChartPoint[], chartScale: ChartScale): string {
  return pointList
    .map((point, pointIndex) => {
      const pointPosition = calculatePointPosition(
        pointIndex,
        point.load,
        pointList.length,
        chartScale
      );

      return `${pointIndex === 0 ? 'M' : 'L'} ${pointPosition.xPosition} ${pointPosition.yPosition}`;
    })
    .join(' ');
}

function buildYTickLoadList(chartScale: ChartScale): number[] {
  return Array.from({ length: Y_TICK_COUNT }, (_, tickIndex) => {
    const tickProgress = tickIndex / (Y_TICK_COUNT - 1);
    return chartScale.maxLoad - tickProgress * chartScale.loadRange;
  });
}

function buildXLabelIndexList(pointCount: number): number[] {
  if (pointCount <= X_LABEL_COUNT) {
    return Array.from({ length: pointCount }, (_, pointIndex) => pointIndex);
  }

  const middleIndex = Math.floor((pointCount - 1) / 2);
  return [0, middleIndex, pointCount - 1];
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
  const chartScale = createChartScale(pointList, chartWidth, CHART_HEIGHT);
  const axisBottomY = CHART_HEIGHT - CHART_PADDING_BOTTOM;
  const axisTopY = CHART_PADDING_TOP;
  const axisLeftX = CHART_PADDING_LEFT;
  const axisRightX = chartWidth - CHART_PADDING_RIGHT;

  const pathValue = buildLinePath(pointList, chartScale);
  const yTickLoadList = buildYTickLoadList(chartScale);
  const xLabelIndexList = buildXLabelIndexList(pointList.length);

  return (
    <View style={styles.container}>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}>
        <Line
          x1={axisLeftX}
          y1={axisTopY}
          x2={axisLeftX}
          y2={axisBottomY}
          stroke={theme.colors.border}
          strokeWidth={AXIS_STROKE_WIDTH}
        />
        <Line
          x1={axisLeftX}
          y1={axisBottomY}
          x2={axisRightX}
          y2={axisBottomY}
          stroke={theme.colors.border}
          strokeWidth={AXIS_STROKE_WIDTH}
        />

        {yTickLoadList.map((yTickLoad) => {
          const normalizedLoad = (yTickLoad - chartScale.minLoad) / chartScale.loadRange;
          const yPosition = CHART_PADDING_TOP + (1 - normalizedLoad) * chartScale.usableHeight;

          return (
            <SvgText
              key={`y-tick-${yTickLoad}`}
              x={axisLeftX - 6}
              y={yPosition + 4}
              fontSize={11}
              fill={theme.colors.textSecondary}
              textAnchor="end"
            >
              {formatLoadTick(yTickLoad)}
            </SvgText>
          );
        })}

        {xLabelIndexList.map((pointIndex) => {
          const pointItem = pointList[pointIndex];
          const pointPosition = calculatePointPosition(
            pointIndex,
            pointItem.load,
            pointList.length,
            chartScale
          );

          return (
            <SvgText
              key={`x-label-${pointIndex}`}
              x={pointPosition.xPosition}
              y={axisBottomY + 16}
              fontSize={11}
              fill={theme.colors.textSecondary}
              textAnchor="middle"
            >
              {formatAxisDate(pointItem.date)}
            </SvgText>
          );
        })}

        <Path
          d={pathValue}
          stroke={theme.colors.primary}
          strokeWidth={LINE_STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
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
