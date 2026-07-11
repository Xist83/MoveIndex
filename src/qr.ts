import QRCode from "qrcode";

export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 512,
  });
}
