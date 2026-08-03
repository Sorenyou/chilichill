/**
 * 类型声明：qrcode-generator（vendored，MIT）
 * 来源：https://github.com/kazuhikoarase/qrcode-generator (v1.4.4)
 * 这里只声明分享卡用到的 API 子集。
 */

declare interface QRCodeResult {
  addData(data: string, mode?: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}

declare function qrcode(typeNumber: number, errorCorrectionLevel: string): QRCodeResult;

export = qrcode;
