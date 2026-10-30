import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

export type IconName =
  | 'up'
  | 'down'
  | 'comment'
  | 'share'
  | 'search'
  | 'home'
  | 'grid'
  | 'sparkle'
  | 'user'
  | 'plus'
  | 'back'
  | 'close'
  | 'dots'
  | 'image'
  | 'link'
  | 'emoji'
  | 'sort';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/** Lightweight Reddit-style outline icon set built on react-native-svg. */
export default function Icon({name, size = 24, color = '#181C1F', strokeWidth = 2}: Props) {
  const stroke = {
    stroke: color,
    strokeWidth,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const svgProps = {width: size, height: size, viewBox: '0 0 24 24'};

  switch (name) {
    case 'up':
      return (
        <Svg {...svgProps}>
          <Path d="M12 4.5 20.5 14h-5.2v5.5H8.7V14H3.5L12 4.5Z" fill={color} />
        </Svg>
      );
    case 'down':
      return (
        <Svg {...svgProps}>
          <Path d="M12 19.5 3.5 10h5.2V4.5h6.6V10h5.2L12 19.5Z" fill={color} />
        </Svg>
      );
    case 'comment':
      return (
        <Svg {...svgProps}>
          <Path
            d="M20 4.5H4A1.5 1.5 0 0 0 2.5 6v10A1.5 1.5 0 0 0 4 17.5h3.5V21l4.8-3.5H20a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 20 4.5Z"
            {...stroke}
          />
        </Svg>
      );
    case 'share':
      return (
        <Svg {...svgProps}>
          <Path
            d="M13.5 5 21 11.5l-7.5 6.5v-4.2c-5.2 0-8.6 1.6-10.5 5 .6-6.7 4.4-10 10.5-10.6V5Z"
            {...stroke}
          />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...svgProps}>
          <Circle cx="11" cy="11" r="6.5" {...stroke} />
          <Path d="m20 20-4.4-4.4" {...stroke} />
        </Svg>
      );
    case 'home':
      return (
        <Svg {...svgProps}>
          <Path d="M4 10.8 12 4l8 6.8V20h-5.4v-5.6h-5.2V20H4v-9.2Z" {...stroke} />
        </Svg>
      );
    case 'grid':
      return (
        <Svg {...svgProps}>
          <Rect x="3.5" y="3.5" width="7" height="7" rx="2" {...stroke} />
          <Rect x="13.5" y="3.5" width="7" height="7" rx="2" {...stroke} />
          <Rect x="3.5" y="13.5" width="7" height="7" rx="2" {...stroke} />
          <Rect x="13.5" y="13.5" width="7" height="7" rx="2" {...stroke} />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg {...svgProps}>
          <Path
            d="M12 3l2.1 6.2 6.4 2.8-6.4 2.8L12 21l-2.1-6.2L3.5 12l6.4-2.8L12 3Z"
            fill={color}
          />
        </Svg>
      );
    case 'user':
      return (
        <Svg {...svgProps}>
          <Circle cx="12" cy="8.2" r="3.7" {...stroke} />
          <Path d="M4.5 20c.8-3.6 3.9-5.4 7.5-5.4s6.7 1.8 7.5 5.4" {...stroke} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...svgProps}>
          <Path d="M12 5v14M5 12h14" {...stroke} />
        </Svg>
      );
    case 'back':
      return (
        <Svg {...svgProps}>
          <Path d="M14.5 5 7.5 12l7 7" {...stroke} />
        </Svg>
      );
    case 'close':
      return (
        <Svg {...svgProps}>
          <Path d="M6 6l12 12M18 6 6 18" {...stroke} />
        </Svg>
      );
    case 'dots':
      return (
        <Svg {...svgProps}>
          <Circle cx="12" cy="5" r="1.6" fill={color} />
          <Circle cx="12" cy="12" r="1.6" fill={color} />
          <Circle cx="12" cy="19" r="1.6" fill={color} />
        </Svg>
      );
    case 'image':
      return (
        <Svg {...svgProps}>
          <Rect x="3.5" y="4.5" width="17" height="15" rx="2.5" {...stroke} />
          <Circle cx="9" cy="10" r="1.8" fill={color} />
          <Path d="m5 18 5-5 3 3 3.5-3.5L20 16" {...stroke} />
        </Svg>
      );
    case 'link':
      return (
        <Svg {...svgProps}>
          <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.2 1.2" {...stroke} />
          <Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.2-1.2" {...stroke} />
        </Svg>
      );
    case 'emoji':
      return (
        <Svg {...svgProps}>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Circle cx="9" cy="10" r="1.3" fill={color} />
          <Circle cx="15" cy="10" r="1.3" fill={color} />
          <Path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" {...stroke} />
        </Svg>
      );
    case 'sort':
      return (
        <Svg {...svgProps}>
          <Path d="m7 10 5-5 5 5M7 14l5 5 5-5" {...stroke} />
        </Svg>
      );
  }
}
