import { QRCodeSVG } from "qrcode.react";

export default function TwoStepQr({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={176} level="M" marginSize={2} />;
}
