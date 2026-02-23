import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { theme } from '../theme';

export type WorkoutVolumeChartPoint = {
  date: string;
  totalVolume: number;
};

type WorkoutVolumeChartProps = {
  pointList: WorkoutVolumeChartPoint[];
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

function formatVolumeTick(volumeValue: number): string {
  return volumeValue.toLocaleString('pt-BR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  });
}

type ChartScale = {
  minVolume: number;
  maxVolume: number;
  volumeRange: number;
  usableWidth: number;
  usableHeight: number;
};

function createChartScale(pointList: WorkoutVolumeChartPoint[], chartWidth: number, chartHeight: number): ChartScale {
  const totalVolumeList = pointList.map((point) => point.totalVolume);
  const rawMinVolume = Math.min(...totalVolumeList);
  const rawMaxVolume = Math.max(...totalVolumeList);

  if (rawMinVolume === rawMaxVolume) {
    const paddedMinVolume = Math.max(0, rawMinVolume - 100);
    const paddedMaxVolume = rawMaxVolume + 100;

    return {
      minVolume: paddedMinVolume,
      maxVolume: paddedMaxVolume,
      volumeRange: paddedMaxVolume - paddedMinVolume,
      usableWidth: chartWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT,
      usableHeight: chartHeight - CHART_PADDING_TOP - CHART_PADDING_BOTTOM
    };
  }

  return {
    minVolume: rawMinVolume,
    maxVolume: rawMaxVolume,
    volumeRange: rawMaxVolume - rawMinVolume,
    usableWidth: chartWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT,
    usableHeight: chartHeight - CHART_PADDING_TOP - CHART_PADDING_BOTTOM
  };
}

function calculatePointPosition(
  pointIndex: number,
  pointTotalVolume: number,
  pointCount: number,
  chartScale: ChartScale
): { xPosition: number; yPosition: number } {
  const horizontalProgress = pointCount === 1 ? 0.5 : pointIndex / (pointCount - 1);
  const xPosition = CHART_PADDING_LEFT + horizontalProgress * chartScale.usableWidth;
  const normalizedVolume = (pointTotalVolume - chartScale.minVolume) / chartScale.volumeRange;
  const yPosition = CHART_PADDING_TOP + (1 - normalizedVolume) * chartScale.usableHeight;

  return { xPosition, yPosition };
}

function buildLinePath(pointList: WorkoutVolumeChartPoint[], chartScale: ChartScale): string {
  return pointList
    .map((point, pointIndex) => {
      const pointPosition = calculatePointPosition(
        pointIndex,
        point.totalVolume,
        pointList.length,
        chartScale
      );

      return `${pointIndex === 0 ? 'M' : 'L'} ${pointPosition.xPosition} ${pointPosition.yPosition}`;
    })
    .join(' ');
}

function buildYTickVolumeList(chartScale: ChartScale): number[] {
  return Array.from({ length: Y_TICK_COUNT }, (_, tickIndex) => {
    const tickProgress = tickIndex / (Y_TICK_COUNT - 1);
    return chartScale.maxVolume - tickProgress * chartScale.volumeRange;
  });
}

function buildXLabelIndexList(pointCount: number): number[] {
  if (pointCount <= X_LABEL_COUNT) {
    return Array.from({ length: pointCount }, (_, pointIndex) => pointIndex);
  }

  const middleIndex = Math.floor((pointCount - 1) / 2);
  return [0, middleIndex, pointCount - 1];
}

export function WorkoutVolumeChart({ pointList }: WorkoutVolumeChartProps) {
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
  const yTickVolumeList = buildYTickVolumeList(chartScale);
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

        {yTickVolumeList.map((yTickVolume) => {
          const normalizedVolume = (yTickVolume - chartScale.minVolume) / chartScale.volumeRange;
          const yPosition = CHART_PADDING_TOP + (1 - normalizedVolume) * chartScale.usableHeight;

          return (
            <SvgText
              key={`y-tick-${yTickVolume}`}
              x={axisLeftX - 6}
              y={yPosition + 4}
              fontSize={11}
              fill={theme.colors.textSecondary}
              textAnchor="end"
            >
              {formatVolumeTick(yTickVolume)}
            </SvgText>
          );
        })}

        {xLabelIndexList.map((pointIndex) => {
          const pointItem = pointList[pointIndex];
          const pointPosition = calculatePointPosition(
            pointIndex,
            pointItem.totalVolume,
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
