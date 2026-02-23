import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';

import { MockHealthDataService } from '../../../src/data/health/HealthDataService';
import { WorkoutSessionRepositorySQLite } from '../../../src/data/repositories/sqlite';
import type { WorkoutSessionSummary } from '../../../src/domain/entities';
import type { HealthWorkoutData } from '../../../src/domain/health/HealthData';
import { Screen } from '../../../src/ui/components/Layout';
import { WorkoutStoryCanvas } from '../../../src/ui/components/WorkoutStoryCanvas';
import { theme } from '../../../src/ui/theme';

const workoutSessionRepository = new WorkoutSessionRepositorySQLite();
const healthDataService = new MockHealthDataService();

export default function WorkoutStoryScreen() {
  const viewShotRef = useRef<ViewShot | null>(null);
  const { sessionId } = useLocalSearchParams<{ sessionId: string | string[] }>();

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [workoutSessionSummary, setWorkoutSessionSummary] = useState<WorkoutSessionSummary | null>(null);
  const [healthWorkoutData, setHealthWorkoutData] = useState<HealthWorkoutData | null>(null);
  const [postWorkoutPhotoUri, setPostWorkoutPhotoUri] = useState<string | undefined>(undefined);

  const parsedSessionId = useMemo(() => {
    const sessionIdParam = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    return Number(sessionIdParam);
  }, [sessionId]);

  useEffect(() => {
    let isCancelled = false;

    const loadStoryData = async () => {
      if (!Number.isInteger(parsedSessionId) || parsedSessionId <= 0) {
        setWorkoutSessionSummary(null);
        setHealthWorkoutData(null);
        setIsLoadingSummary(false);
        return;
      }

      try {
        setIsLoadingSummary(true);
        const [loadedSummary, loadedHealthData] = await Promise.all([
          workoutSessionRepository.getWorkoutSessionSummary(parsedSessionId),
          healthDataService.getHealthDataForSession(parsedSessionId)
        ]);

        if (!isCancelled) {
          setWorkoutSessionSummary(loadedSummary ?? null);
          setHealthWorkoutData(loadedHealthData ?? null);
        }
      } catch (error) {
        console.error('Failed to load workout summary for story', error);

        if (!isCancelled) {
          setWorkoutSessionSummary(null);
          setHealthWorkoutData(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSummary(false);
        }
      }
    };

    loadStoryData();

    return () => {
      isCancelled = true;
    };
  }, [parsedSessionId]);

  const handleCapturePostWorkoutPhoto = useCallback(async () => {
    try {
      setIsCapturingPhoto(true);

      const { status: permissionStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionStatus !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera para tirar sua foto pós-treino.');
        return;
      }

      const capturedImage = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
        aspect: [9, 16]
      });

      if (!capturedImage.canceled && capturedImage.assets.length > 0) {
        setPostWorkoutPhotoUri(capturedImage.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to capture post workout photo', error);
      Alert.alert('Erro ao tirar foto', 'Não foi possível tirar a foto agora. Tente novamente.');
    } finally {
      setIsCapturingPhoto(false);
    }
  }, []);

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
        <WorkoutStoryCanvas
          summary={workoutSessionSummary}
          photoUri={postWorkoutPhotoUri}
          healthData={healthWorkoutData}
        />
      </ViewShot>

      <Pressable
        style={[styles.secondaryButton, isCapturingPhoto && styles.buttonDisabled]}
        onPress={handleCapturePostWorkoutPhoto}
        disabled={isCapturingPhoto}
      >
        <Text style={styles.secondaryButtonText}>
          {isCapturingPhoto ? 'Abrindo câmera...' : 'Tirar foto pós-treino'}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.shareButton, isSharingStory && styles.buttonDisabled]}
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
  secondaryButton: {
    borderRadius: theme.radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface
  },
  buttonDisabled: {
    opacity: 0.8
  },
  shareButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButtonText: {
    color: theme.colors.primary,
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
