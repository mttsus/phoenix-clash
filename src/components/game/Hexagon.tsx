
import React from 'react';

interface HexagonProps {
  q: number;
  r: number;
  s: number;
  type?: string;
  owner?: string | null;
  isUserCastle?: boolean;
  username?: string | null;
  onClick: (q: number, r: number, s: number) => void;
}

export const Hexagon: React.FC<HexagonProps> = ({
  q,
  r,
  s,
  type,
  owner,
  isUserCastle,
  username,
  onClick
}) => {
  const size = 30;
  const x = size * (3/2 * q);
  const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);

  const getHexColor = () => {
    if (type === 'castle') {
      if (isUserCastle) return '#4ade80'; // green for user castle
      return '#ef4444'; // red for enemy castle
    }
    if (type === 'mine') return '#a855f7'; // purple for mines
    if (type === 'forest') return '#22c55e'; // green for forests
    return 'transparent'; // empty hex
  };

  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = size * Math.cos(angle);
    const py = size * Math.sin(angle);
    hexPoints.push(`${px},${py}`);
  }

  return (
    <g
      transform={`translate(${x + 400}, ${y + 300})`}
      onClick={() => onClick(q, r, s)}
      style={{ cursor: 'pointer' }}
    >
      <polygon
        points={hexPoints.join(' ')}
        fill={getHexColor()}
        stroke="#64748b"
        strokeWidth="1"
        opacity={type ? 0.8 : 0.3}
      />
      {username && (
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontSize="10"
          fill="#ffffff"
          fontWeight="bold"
        >
          {username}
        </text>
      )}
    </g>
  );
};
