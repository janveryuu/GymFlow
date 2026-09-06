declare module 'expo-camera' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export type CameraFacing = 'front' | 'back';
  export type BarcodeType =
    | 'aztec' | 'ean13' | 'ean8' | 'qr' | 'pdf417'
    | 'upc_e' | 'datamatrix' | 'code39' | 'code93'
    | 'itf14' | 'codabar' | 'code128' | 'upc_a'
    | 'interleaved2of5';

  export interface BarcodeScanningResult {
    type: string;
    data: string;
    bounds?: { origin: { x: number; y: number }; size: { width: number; height: number } };
    cornerPoints?: { x: number; y: number }[];
  }

  export interface BarcodeScannerSettings {
    barcodeTypes?: BarcodeType[];
  }

  export interface CameraViewProps extends ViewProps {
    facing?: CameraFacing;
    barcodeScannerSettings?: BarcodeScannerSettings;
    onBarcodeScanned?: (result: BarcodeScanningResult) => void;
    zoom?: number;
    flash?: 'on' | 'off' | 'auto';
  }

  export interface CameraPermissionResponse {
    granted: boolean;
    canAskAgain: boolean;
    status: string;
    expires: string;
  }

  export interface CameraRef {
    takePictureAsync(options?: {
      quality?: number;
      base64?: boolean;
      exif?: boolean;
    }): Promise<{ uri: string; base64?: string; width: number; height: number }>;
  }

  export const CameraView: React.ForwardRefExoticComponent<
    CameraViewProps & React.RefAttributes<CameraRef>
  >;

  export function useCameraPermissions(): [
    CameraPermissionResponse | null,
    () => Promise<CameraPermissionResponse>
  ];
}
