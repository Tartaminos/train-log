import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { MockHealthDataService } from '../../../src/data/health/HealthDataService';
import { WorkoutSessionRepositorySQLite } from '../../../src/data/repositories/sqlite';
import type { WorkoutSessionSummary } from '../../../src/domain/entities';
import type { HealthWorkoutData } from '../../../src/domain/health/HealthData';
import { Screen } from '../../../src/ui/components/Layout';
import { WorkoutStoryCanvas } from '../../../src/ui/components/WorkoutStoryCanvas';
import { syncAndroidNavigationBarDynamicMode } from '../../../src/ui/system-ui/androidNavigationBar';
import { theme } from '../../../src/ui/theme';

const workoutSessionRepository = new WorkoutSessionRepositorySQLite();
const healthDataService = new MockHealthDataService();

export default function WorkoutStoryScreen() {
  const viewShotRef = useRef<ViewShot | null>(null);
  const { sessionId } = useLocalSearchParams<{ sessionId: string | string[] }>();
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [storyActionFeedback, setStoryActionFeedback] = useState<string | null>(null);
  const [workoutSessionSummary, setWorkoutSessionSummary] = useState<WorkoutSessionSummary | null>(null);
  const [healthWorkoutData, setHealthWorkoutData] = useState<HealthWorkoutData | null>(null);
  const [isHealthIntegrationEnabled, setIsHealthIntegrationEnabled] = useState(false);
  const [postWorkoutPhotoUri, setPostWorkoutPhotoUri] = useState<string | null>(null);

  const mediaLibraryAccessMessage = useMemo(() => {
    if (Constants.appOwnership === 'expo') {
      return 'No Expo Go, o acesso completo à biblioteca é limitado. Use um dev build para testar salvar na galeria.';
    }

    return 'Não foi possível acessar a galeria. Verifique as permissões do aplicativo e tente novamente.';
  }, []);

  useFocusEffect(
    useCallback(() => {
      syncAndroidNavigationBarDynamicMode();

      return undefined;
    }, [])
  );

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
        setIsHealthIntegrationEnabled(false);
        setIsLoadingSummary(false);
        return;
      }

      try {
        setIsLoadingSummary(true);
        const [loadedSummary, healthIntegrationEnabled, loadedHealthData] = await Promise.all([
          workoutSessionRepository.getWorkoutSessionSummary(parsedSessionId),
          healthDataService.isHealthIntegrationEnabled(),
          healthDataService.getHealthDataForSession(parsedSessionId)
        ]);

        if (!isCancelled) {
          setWorkoutSessionSummary(loadedSummary ?? null);
          setIsHealthIntegrationEnabled(healthIntegrationEnabled);
          setHealthWorkoutData(healthIntegrationEnabled ? loadedHealthData ?? null : null);
        }
      } catch (error) {
        console.error('Failed to load workout summary for story', error);

        if (!isCancelled) {
          setWorkoutSessionSummary(null);
          setHealthWorkoutData(null);
          setIsHealthIntegrationEnabled(false);
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

      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera para tirar sua foto pós-treino.');
        return;
      }

      const cameraResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images' satisfies ImagePicker.MediaType],
        quality: 1,
        allowsEditing: true,
        aspect: [9, 16]
      });

      if (cameraResult.canceled) {
        return;
      }

      const capturedPhotoUri = cameraResult.assets?.[0]?.uri;
      if (!capturedPhotoUri) {
        Alert.alert('Erro ao tirar foto', 'Não foi possível obter a foto capturada. Tente novamente.');
        return;
      }

      setPostWorkoutPhotoUri(capturedPhotoUri);
    } catch (error) {
      console.log(error);
      console.error('Failed to capture post workout photo', error);
      Alert.alert('Erro ao tirar foto', 'Não foi possível tirar a foto agora. Tente novamente.');
    } finally {
      setIsCapturingPhoto(false);
    }
  }, []);

  const captureStoryImage = useCallback(async () => {
    if (!viewShotRef.current || !workoutSessionSummary) {
      return null;
    }

    const generatedImageUri = await viewShotRef.current.capture?.();
    if (!generatedImageUri) {
      throw new Error('Story image capture failed');
    }

    return generatedImageUri;
  }, [workoutSessionSummary]);

  const handleShareStory = useCallback(async () => {
    if (!workoutSessionSummary) {
      return;
    }

    try {
      setIsSharingStory(true);

      const isShareAvailable = await Sharing.isAvailableAsync();
      if (!isShareAvailable) {
        Alert.alert('Compartilhamento indisponível', 'Seu dispositivo não suporta compartilhamento neste momento.');
        return;
      }

      const generatedImageUri = await captureStoryImage();
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
  }, [captureStoryImage, workoutSessionSummary]);

  const handleSaveStoryToGallery = useCallback(async () => {
    if (!workoutSessionSummary) {
      return;
    }

    try {
      setIsSavingStory(true);
      setStoryActionFeedback(null);

      let mediaLibraryPermissionGranted = false;

      try {
        const currentMediaLibraryPermission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
        mediaLibraryPermissionGranted =
          currentMediaLibraryPermission.status === MediaLibrary.PermissionStatus.GRANTED;
      } catch (permissionError) {
        console.error('Failed to get media library permission', permissionError);
      }

      if (!mediaLibraryPermissionGranted) {
        try {
          const requestedMediaLibraryPermission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
          mediaLibraryPermissionGranted =
            requestedMediaLibraryPermission.status === MediaLibrary.PermissionStatus.GRANTED;
        } catch (permissionError) {
          console.error('Failed to request media library permission', permissionError);
        }
      }

      if (!mediaLibraryPermissionGranted) {
        setStoryActionFeedback(mediaLibraryAccessMessage);
        return;
      }

      const generatedImageUri = await captureStoryImage();
      if (!generatedImageUri) {
        setStoryActionFeedback('Não foi possível gerar a imagem do story.');
        return;
      }

      await MediaLibrary.createAssetAsync(generatedImageUri);
      setStoryActionFeedback('Story salvo na galeria!');
    } catch (error) {
      console.error('Failed to save story to gallery', error);
      setStoryActionFeedback('Erro ao salvar story na galeria.');
    } finally {
      setIsSavingStory(false);
    }
  }, [captureStoryImage, mediaLibraryAccessMessage, workoutSessionSummary]);

  const handleBackToHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const scrollContentContainerStyle = useMemo(
    () => ({
      ...styles.scrollContentContainer,
      paddingBottom: theme.spacing.xl + safeAreaInsets.bottom
    }),
    [safeAreaInsets.bottom]
  );

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
    <Screen isScrollable style={styles.screen} contentContainerStyle={scrollContentContainerStyle}>
      <ViewShot
        ref={viewShotRef}
        style={styles.storyWrapper}
        options={{ format: 'png', quality: 1, result: 'tmpfile' }}
      >
        <WorkoutStoryCanvas
          summary={workoutSessionSummary}
          photoUri={postWorkoutPhotoUri}
          healthData={healthWorkoutData}
          isHealthIntegrationEnabled={isHealthIntegrationEnabled}
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

      <Pressable
        style={[styles.secondaryButton, isSavingStory && styles.buttonDisabled]}
        onPress={handleSaveStoryToGallery}
        disabled={isSavingStory}
      >
        <Text style={styles.secondaryButtonText}>{isSavingStory ? 'Salvando story...' : 'Salvar na galeria'}</Text>
      </Pressable>

      {storyActionFeedback ? <Text style={styles.storyActionFeedbackText}>{storyActionFeedback}</Text> : null}

      <Pressable style={styles.tertiaryButton} onPress={handleBackToHome}>
        <Text style={styles.tertiaryButtonText}>Voltar para início</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  scrollContentContainer: {
    flexGrow: 1,
    gap: theme.spacing.md
  },
  storyWrapper: {
    width: '100%',
    aspectRatio: 9 / 16,
    alignSelf: 'center',
    overflow: 'hidden'
  },
  shareButton: {
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
  tertiaryButton: {
    borderRadius: theme.radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background
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
  tertiaryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600'
  },
  storyActionFeedbackText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center'
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
