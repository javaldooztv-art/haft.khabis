import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeViewProps {
  value: string;
  size?: number;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({ value, size = 160 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error(err);
        }
      );
    }
  }, [value, size]);

  return (
    <div className="p-2 bg-white rounded-xl shadow-lg inline-block">
      <canvas ref={canvasRef} />
    </div>
  );
};
