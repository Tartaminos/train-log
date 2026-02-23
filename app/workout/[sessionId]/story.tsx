import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';

import { WorkoutSessionRepositorySQLite } from '../../../src/data/repositories/sqlite';
import type { WorkoutSessionSummary } from '../../../src/domain/entities';
import { Screen } from '../../../src/ui/components/Layout';
import { WorkoutStoryCanvas } from '../../../src/ui/components/WorkoutStoryCanvas';
import { theme } from '../../../src/ui/theme';

const workoutSessionRepository = new WorkoutSessionRepositorySQLite();

export default function WorkoutStoryScreen() {
  const viewShotRef = useRef<ViewShot | null>(null);
  const { sessionId } = useLocalSearchParams<{ sessionId: string | string[] }>();

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [workoutSessionSummary, setWorkoutSessionSummary] = useState<WorkoutSessionSummary | null>(null);

  const parsedSessionId = useMemo(() => {
    const sessionIdParam = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    return Number(sessionIdParam);
  }, [sessionId]);

  useEffect(() => {
    let isCancelled = false;

    const loadWorkoutSummary = async () => {
      if (!Number.isInteger(parsedSessionId) || parsedSessionId <= 0) {
        setWorkoutSessionSummary(null);
        setIsLoadingSummary(false);
        return;
      }

      try {
        setIsLoadingSummary(true);
        const loadedSummary = await workoutSessionRepository.getWorkoutSessionSummary(parsedSessionId);

        if (!isCancelled) {
          setWorkoutSessionSummary(loadedSummary ?? null);
        }
      } catch (error) {
        console.error('Failed to load workout summary for story', error);

        if (!isCancelled) {
          setWorkoutSessionSummary(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSummary(false);
        }
      }
    };

    loadWorkoutSummary();

    return () => {
      isCancelled = true;
    };
  }, [parsedSessionId]);

  const handleShareStory = useCallback(async () => {
    if (!viewShotRef.current || !workoutSessionSummary) {
      return;
    }

    try {
      setIsSharingStory(true);

      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        Alert.alert('Compartilhamento indisponível', 'Seu dispositivo não suporta compartilhamento neste momento.');
        return;
      }

      const generatedImageUri = await viewShotRef.current.capture?.();
      if (!generatedImageUri) {
        Alert.alert('Erro ao gerar story', 'Não foi possível gerar a imagem do story.');
        return;
      }

      await Sharing.shareAsync(generatedImageUri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartilhar Story de treino'
      });
    } catch (error) {
      console.error('Failed to share story', error);
      Alert.alert('Erro ao compartilhar', 'Não foi possível compartilhar seu story agora. Tente novamente.');
    } finally {
      setIsSharingStory(false);
    }
  }, [workoutSessionSummary]);

  if (isLoadingSummary) {
    return (
      <Screen>
        <Text style={styles.feedbackText}>Carregando dados do story...</Text>
      </Screen>
    );
  }

  if (!workoutSessionSummary) {
    return (
      <Screen style={styles.centeredScreen}>
        <Text style={styles.feedbackText}>Resumo da sessão não encontrado.</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ViewShot
        ref={viewShotRef}
        style={styles.storyWrapper}
        options={{ format: 'png', quality: 1, result: 'tmpfile' }}
      >
        <WorkoutStoryCanvas summary={workoutSessionSummary} />
      </ViewShot>

      <Pressable
        style={[styles.shareButton, isSharingStory && styles.shareButtonDisabled]}
        onPress={handleShareStory}
        disabled={isSharingStory}
      >
        <Text style={styles.shareButtonText}>{isSharingStory ? 'Gerando imagem...' : 'Compartilhar Story'}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
    gap: theme.spacing.md
  },
  storyWrapper: {
    width: '100%'
  },
  shareButton: {
    marginTop: 'auto',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md
  },
  shareButtonDisabled: {
    opacity: 0.8
  },
  shareButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  centeredScreen: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  feedbackText: {
    color: theme.colors.textSecondary,
    fontSize: 16
  }
});
