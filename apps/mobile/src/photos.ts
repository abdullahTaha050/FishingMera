import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export interface LocalPhoto {
  id: string;
  uri: string;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  syncStatus: "PENDING" | "SYNCED";
}

async function persistAsset(asset: ImagePicker.ImagePickerAsset): Promise<LocalPhoto> {
  if (!FileSystem.documentDirectory) throw new Error("DOCUMENT_DIRECTORY_UNAVAILABLE");
  if (asset.fileSize && asset.fileSize > 15 * 1024 * 1024) throw new Error("PHOTO_TOO_LARGE");
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > 1800) context.resize({ width: 1800, height: null });
  const rendered = await context.renderAsync();
  const encoded = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const directory = `${FileSystem.documentDirectory}photos/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const id = globalThis.crypto.randomUUID();
  const destination = `${directory}${id}.jpg`;
  await FileSystem.copyAsync({ from: encoded.uri, to: destination });
  return { id, uri: destination, mimeType: "image/jpeg", width: encoded.width, height: encoded.height, syncStatus: "PENDING" };
}

export async function pickLocalPhoto(source: "camera" | "library"): Promise<LocalPhoto | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("CAMERA_PERMISSION_DENIED");
  }
  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9, exif: false })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9, exif: false });
  if (result.canceled) return null;
  return persistAsset(result.assets[0]);
}

export async function recoverPendingLocalPhoto(): Promise<LocalPhoto | null> {
  const result = await ImagePicker.getPendingResultAsync();
  if (!result || "code" in result || result.canceled) return null;
  return persistAsset(result.assets[0]);
}
