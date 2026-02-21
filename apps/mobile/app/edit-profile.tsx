import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { triggerHaptic } from "@/hooks/useHaptics";
import { useAuth } from "@/providers/AuthProvider";
import {
  useCurrentProfile,
  useUpdateProfile,
  useUploadAvatar,
} from "@propian/shared/hooks";
import { Avatar, Button } from "@/components/ui";
import Svg, { Path } from "react-native-svg";

/* ─── Icons ─── */
function IconCamera({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 17a4 4 0 100-8 4 4 0 000 8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconX({ size = 20, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconCheck({ size = 20, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ─── Image Cropper Component ─── */
const CROP_SIZE = 280;

interface ImageCropperProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  onCrop: (croppedUri: string, base64: string) => void;
  onCancel: () => void;
}

function ImageCropper({ imageUri, imageWidth, imageHeight, onCrop, onCancel }: ImageCropperProps) {
  const [isCropping, setIsCropping] = useState(false);

  // Fit the image so its shortest side fills the crop circle
  const baseScale = Math.max(CROP_SIZE / imageWidth, CROP_SIZE / imageHeight);

  // zoom is user-controlled (1 = fit, up to 4x)
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  // Displayed dimensions at current zoom
  const imgW = imageWidth * baseScale * zoom;
  const imgH = imageHeight * baseScale * zoom;

  // --- Pan tracking (plain refs → re-render via Animated) ---
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Persisted offsets between gestures
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);

  // Pinch tracking
  const pinchBaseDistance = useRef(0);
  const pinchBaseZoom = useRef(1);

  /** Clamp so the image always covers the full circle. */
  const clamp = useCallback(
    (x: number, y: number, w: number, h: number) => {
      // The image top-left relative to crop circle top-left:
      //   allowed range: from  -(w - CROP_SIZE)  to  0
      const minX = -(w - CROP_SIZE);
      const maxX = 0;
      const minY = -(h - CROP_SIZE);
      const maxY = 0;
      return {
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
      };
    },
    [],
  );

  // Recenter when zoom changes (e.g. via buttons)
  useEffect(() => {
    const w = imageWidth * baseScale * zoom;
    const h = imageHeight * baseScale * zoom;
    const clamped = clamp(offsetXRef.current, offsetYRef.current, w, h);
    offsetXRef.current = clamped.x;
    offsetYRef.current = clamped.y;
    panX.setValue(clamped.x);
    panY.setValue(clamped.y);
    zoomRef.current = zoom;
  }, [zoom, baseScale, imageWidth, imageHeight, clamp, panX, panY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,

      onPanResponderGrant: () => {
        pinchBaseDistance.current = 0;
      },

      onPanResponderMove: (evt, gesture) => {
        const touches = evt.nativeEvent.touches;

        if (touches && touches.length >= 2) {
          // ── Pinch-to-zoom ──
          const t0 = touches[0] as any;
          const t1 = touches[1] as any;
          const dx = t0.pageX - t1.pageX;
          const dy = t0.pageY - t1.pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (pinchBaseDistance.current === 0) {
            // First pinch frame: record baseline
            pinchBaseDistance.current = dist;
            pinchBaseZoom.current = zoomRef.current;
          } else {
            const newZoom = Math.min(
              4,
              Math.max(1, pinchBaseZoom.current * (dist / pinchBaseDistance.current)),
            );
            zoomRef.current = newZoom;
            setZoom(newZoom);
          }
        } else {
          // ── Single-finger drag ──
          // gesture.dx/dy are cumulative from grant, so compute absolute position
          const currentZoom = zoomRef.current;
          const w = imageWidth * baseScale * currentZoom;
          const h = imageHeight * baseScale * currentZoom;

          const rawX = offsetXRef.current + gesture.dx;
          const rawY = offsetYRef.current + gesture.dy;
          const clamped = {
            x: Math.min(0, Math.max(-(w - CROP_SIZE), rawX)),
            y: Math.min(0, Math.max(-(h - CROP_SIZE), rawY)),
          };

          panX.setValue(clamped.x);
          panY.setValue(clamped.y);
        }
      },

      onPanResponderRelease: (_evt, gesture) => {
        // Persist final pan offset after clamp
        const currentZoom = zoomRef.current;
        const w = imageWidth * baseScale * currentZoom;
        const h = imageHeight * baseScale * currentZoom;

        const rawX = offsetXRef.current + gesture.dx;
        const rawY = offsetYRef.current + gesture.dy;
        offsetXRef.current = Math.min(0, Math.max(-(w - CROP_SIZE), rawX));
        offsetYRef.current = Math.min(0, Math.max(-(h - CROP_SIZE), rawY));

        pinchBaseDistance.current = 0;
      },
    }),
  ).current;

  const handleCrop = useCallback(async () => {
    setIsCropping(true);
    try {
      const currentZoom = zoomRef.current;
      const scale = baseScale * currentZoom;

      // The crop circle covers [0..CROP_SIZE] x [0..CROP_SIZE] in view coords.
      // The image top-left is at (offsetXRef, offsetYRef) in view coords.
      // Convert circle region back to original pixel coords:
      const originX = Math.max(0, Math.round(-offsetXRef.current / scale));
      const originY = Math.max(0, Math.round(-offsetYRef.current / scale));
      const cropPx = Math.round(CROP_SIZE / scale);

      const w = Math.min(cropPx, imageWidth - originX);
      const h = Math.min(cropPx, imageHeight - originY);
      const side = Math.min(w, h);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width: side, height: side } },
          { resize: { width: 512, height: 512 } },
        ],
        {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      onCrop(result.uri, result.base64 ?? "");
    } catch (_err) {
      Alert.alert("Crop failed", "Could not crop the image. Please try again.");
    } finally {
      setIsCropping(false);
    }
  }, [imageUri, imageWidth, imageHeight, baseScale, onCrop]);

  const adjustZoom = useCallback(
    (delta: number) => {
      setZoom((z) => {
        const next = Math.min(4, Math.max(1, +(z + delta).toFixed(2)));
        return next;
      });
    },
    [],
  );

  return (
    <View style={cropStyles.container}>
      <Text style={cropStyles.title}>Adjust your photo</Text>
      <Text style={cropStyles.subtitle}>Drag to position, pinch to zoom</Text>

      {/* Crop area */}
      <View style={cropStyles.cropArea}>
        <View
          style={[cropStyles.imageContainer, { width: CROP_SIZE, height: CROP_SIZE }]}
          {...panResponder.panHandlers}
        >
          <Animated.Image
            source={{ uri: imageUri }}
            style={{
              width: imgW,
              height: imgH,
              position: "absolute",
              transform: [
                { translateX: panX },
                { translateY: panY },
              ],
            }}
            resizeMode="cover"
          />
          {/* Circle overlay */}
          <View style={cropStyles.overlayMask} pointerEvents="none">
            <View style={cropStyles.circleGuide} />
          </View>
        </View>
      </View>

      {/* Zoom controls */}
      <View style={cropStyles.zoomRow}>
        <Pressable
          style={cropStyles.zoomButton}
          onPress={() => adjustZoom(-0.25)}
        >
          <Text style={cropStyles.zoomText}>−</Text>
        </Pressable>
        <Text style={cropStyles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
        <Pressable
          style={cropStyles.zoomButton}
          onPress={() => adjustZoom(0.25)}
        >
          <Text style={cropStyles.zoomText}>+</Text>
        </Pressable>
      </View>

      {/* Actions */}
      <View style={cropStyles.actions}>
        <Pressable style={cropStyles.cancelBtn} onPress={onCancel}>
          <IconX size={20} color={colors.g600} />
          <Text style={cropStyles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[cropStyles.cropBtn, isCropping && { opacity: 0.6 }]}
          onPress={handleCrop}
          disabled={isCropping}
        >
          {isCropping ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : (
            <>
              <IconCheck size={20} color={colors.black} />
              <Text style={cropStyles.cropText}>Use Photo</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* ─── Main Screen ─── */
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: profile, isLoading } = useCurrentProfile(supabase, user?.id);
  const updateProfile = useUpdateProfile(supabase);
  const uploadAvatar = useUploadAvatar(supabase);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [tradingStyle, setTradingStyle] = useState<string>("");
  const [experienceLevel, setExperienceLevel] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Image cropper state
  const [cropImage, setCropImage] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    uri: string;
    base64: string;
  } | null>(null);

  // Sync form from profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setWebsite(profile.website || "");
      setLocation(profile.location || "");
      setTradingStyle(profile.trading_style || "");
      setExperienceLevel(profile.experience_level || "");
      if (!avatarPreview) setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const pickImage = useCallback(async (source: "gallery" | "camera") => {
    triggerHaptic("light");

    const permissionFn =
      source === "camera"
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status } = await permissionFn();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        `Please grant ${source === "camera" ? "camera" : "photo library"} access in your device settings.`,
      );
      return;
    }

    const launchFn =
      source === "camera"
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    const result = await launchFn({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: false, // We use our own cropper
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setCropImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });
    }
  }, []);

  const showImagePicker = useCallback(() => {
    triggerHaptic("light");
    Alert.alert("Change Profile Photo", "Choose a source", [
      { text: "Camera", onPress: () => pickImage("camera") },
      { text: "Photo Library", onPress: () => pickImage("gallery") },
      ...(avatarPreview
        ? [
            {
              text: "Remove Photo",
              style: "destructive" as const,
              onPress: () => {
                setAvatarPreview(null);
                setPendingUpload(null);
              },
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }, [pickImage, avatarPreview]);

  const handleCropComplete = useCallback((croppedUri: string, base64: string) => {
    setAvatarPreview(croppedUri);
    setPendingUpload({ uri: croppedUri, base64 });
    setCropImage(null);
    triggerHaptic("success");
  }, []);

  const handleSave = useCallback(async () => {
    triggerHaptic("light");
    setSaved(false);

    try {
      // Upload avatar if changed
      if (pendingUpload) {
        await uploadAvatar.mutateAsync({
          base64: pendingUpload.base64,
          type: "image/jpeg",
        });
        setPendingUpload(null);
      }

      // Update profile fields
      const updates: Record<string, any> = {};
      if (displayName !== profile?.display_name) updates.display_name = displayName;
      if (username !== profile?.username) updates.username = username;
      if (bio !== (profile?.bio ?? "")) updates.bio = bio || null;
      if (website !== (profile?.website ?? "")) updates.website = website || null;
      if (location !== (profile?.location ?? "")) updates.location = location || null;
      if (tradingStyle !== (profile?.trading_style ?? ""))
        updates.trading_style = tradingStyle || null;
      if (experienceLevel !== (profile?.experience_level ?? ""))
        updates.experience_level = experienceLevel || null;

      // Remove avatar_url if removed
      if (!avatarPreview && profile?.avatar_url) {
        updates.avatar_url = null;
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile.mutateAsync(updates);
      }

      setSaved(true);
      triggerHaptic("success");
      setTimeout(() => {
        router.back();
      }, 800);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save profile");
    }
  }, [
    pendingUpload,
    displayName,
    username,
    bio,
    website,
    location,
    tradingStyle,
    experienceLevel,
    avatarPreview,
    profile,
    uploadAvatar,
    updateProfile,
    router,
  ]);

  const isSaving = updateProfile.isPending || uploadAvatar.isPending;

  // If in crop mode, show the cropper
  if (cropImage) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <ImageCropper
          imageUri={cropImage.uri}
          imageWidth={cropImage.width}
          imageHeight={cropImage.height}
          onCrop={handleCropComplete}
          onCancel={() => setCropImage(null)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable
          onPress={handleSave}
          style={[styles.headerBtn, styles.saveBtn, isSaving && { opacity: 0.5 }]}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : saved ? (
            <IconCheck size={18} color={colors.black} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <Pressable onPress={showImagePicker} style={styles.avatarWrapper}>
            {avatarPreview ? (
              <Image
                source={{ uri: avatarPreview }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {(displayName || "?")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <IconCamera size={18} color={colors.white} />
            </View>
          </Pressable>
          <Pressable onPress={showImagePicker}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </Pressable>
        </View>

        {/* Form fields */}
        <View style={styles.formSection}>
          <View style={styles.field}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.g400}
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameRow}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                value={username}
                onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="username"
                placeholderTextColor={colors.g400}
                autoCapitalize="none"
                maxLength={20}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell other traders about yourself..."
              placeholderTextColor={colors.g400}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/300</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yoursite.com"
              placeholderTextColor={colors.g400}
              autoCapitalize="none"
              keyboardType="url"
              maxLength={200}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. New York, US"
              placeholderTextColor={colors.g400}
              maxLength={100}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Trading Style</Text>
            <View style={styles.chipRow}>
              {(["scalper", "day-trader", "swing", "position"] as const).map((style) => (
                <Pressable
                  key={style}
                  style={[
                    styles.chip,
                    tradingStyle === style && styles.chipActive,
                  ]}
                  onPress={() => {
                    triggerHaptic("light");
                    setTradingStyle(tradingStyle === style ? "" : style);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      tradingStyle === style && styles.chipTextActive,
                    ]}
                  >
                    {style.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Experience Level</Text>
            <View style={styles.chipRow}>
              {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.chip,
                    experienceLevel === level && styles.chipActive,
                  ]}
                  onPress={() => {
                    triggerHaptic("light");
                    setExperienceLevel(experienceLevel === level ? "" : level);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      experienceLevel === level && styles.chipTextActive,
                    ]}
                  >
                    {level.replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  headerBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    minWidth: 60,
  },
  headerBtnText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: colors.g500,
  },
  headerTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
  },
  saveBtn: {
    backgroundColor: colors.lime,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
    borderWidth: 2,
    borderColor: colors.black,
  },
  saveBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: colors.black,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 12,
  },
  avatarWrapper: {
    position: "relative",
    width: 100,
    height: 100,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.black,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.g600,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.black,
  },
  avatarInitials: {
    fontFamily: "Outfit_700Bold",
    fontSize: 32,
    color: colors.white,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
  },
  changePhotoText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: colors.lime,
  },
  formSection: {
    paddingHorizontal: 20,
    gap: 22,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.g500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: colors.black,
    backgroundColor: colors.g50,
  },
  textarea: {
    minHeight: 90,
    paddingTop: 12,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  atSymbol: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: colors.g400,
    backgroundColor: colors.g100,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRightWidth: 0,
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  charCount: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
    textAlign: "right",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.g200,
    backgroundColor: colors.g50,
  },
  chipActive: {
    borderColor: colors.black,
    backgroundColor: colors.lime,
  },
  chipText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: colors.g500,
  },
  chipTextActive: {
    color: colors.black,
    fontFamily: "Outfit_600SemiBold",
  },
});

const cropStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g400,
    marginBottom: 24,
  },
  cropArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    overflow: "hidden",
    borderRadius: CROP_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.lime,
    backgroundColor: colors.g800,
  },
  overlayMask: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  circleGuide: {
    width: CROP_SIZE - 6,
    height: CROP_SIZE - 6,
    borderRadius: (CROP_SIZE - 6) / 2,
    borderWidth: 1,
    borderColor: "rgba(168, 255, 57, 0.3)",
  },
  zoomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 24,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.g800,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.g600,
  },
  zoomText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: colors.white,
    lineHeight: 24,
  },
  zoomLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: colors.g400,
    minWidth: 50,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
    width: "100%",
    justifyContent: "center",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.g600,
    backgroundColor: colors.g800,
  },
  cancelText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: colors.g400,
  },
  cropBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.black,
    backgroundColor: colors.lime,
  },
  cropText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: colors.black,
  },
});
