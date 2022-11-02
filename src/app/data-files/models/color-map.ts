/*jshint bitwise: false*/
const LOOKUP_LENGTH: number = 65536;

export interface PalettePoint {
  x: number;
  y: number;
}

type Palette = PalettePoint[];

export interface ColorMap {
  name: string;
  redPalette: Palette;
  greenPalette: Palette;
  bluePalette: Palette;
  redLookup: Uint16Array;
  greenLookup: Uint16Array;
  blueLookup: Uint16Array;
}

function getColorFromChannel(i: number, count: number, cc: Array<PalettePoint>) {
  // CC must have length >= 2

  let x = i / count;
  let index = 0;
  while (index < cc.length && cc[index].x < x) {
    index++;
  }

  if (index === 0) {
    return cc[0].y * 65535;
  }
  if (index === cc.length) {
    return cc[cc.length - 1].y * 65535;
  }

  // interpolate
  let m = (cc[index].y - cc[index - 1].y) / (cc[index].x - cc[index - 1].x);
  if (m !== 0) {
    return (m * (x - cc[index - 1].x) + cc[index - 1].y) * 65535;
  } else {
    return cc[index - 1].y * 65535;
  }
}

function getColor(i: number, count: number, red: Palette, green: Palette, blue: Palette) {
  let r = getColorFromChannel(i, count, red);
  let g = getColorFromChannel(i, count, green);
  let b = getColorFromChannel(i, count, blue);
  let a = 255;

  return [r, g, b]
}

function createColorMap(name: string, red: Palette, green: Palette, blue: Palette): ColorMap {
  let colorMap: ColorMap = {
    name: name,
    redPalette: red,
    greenPalette: green,
    bluePalette: blue,
    redLookup: new Uint16Array(LOOKUP_LENGTH),
    greenLookup: new Uint16Array(LOOKUP_LENGTH),
    blueLookup: new Uint16Array(LOOKUP_LENGTH),
  };

  for (let i = 0; i < LOOKUP_LENGTH; i++) {
    [colorMap.redLookup[i], colorMap.greenLookup[i], colorMap.blueLookup[i]] = getColor(i, LOOKUP_LENGTH, colorMap.redPalette, colorMap.greenPalette, colorMap.bluePalette);
  }

  return colorMap;
}

export let grayColorMap = createColorMap(
  'Gray',
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]
);

export let rainbowColorMap = createColorMap(
  'Rainbow',
  [
    { x: 0, y: 1 },
    { x: 0.2, y: 0 },
    { x: 0.6, y: 0 },
    { x: 0.8, y: 1 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0.2, y: 0 },
    { x: 0.4, y: 1 },
    { x: 0.8, y: 1 },
    { x: 1, y: 0 },
  ],
  [
    { x: 0, y: 1 },
    { x: 0.4, y: 1 },
    { x: 0.6, y: 0 },
    { x: 1, y: 0 },
  ]
);

export let coolColorMap = createColorMap(
  'Cool',
  [
    { x: 0, y: 0 },
    { x: 0.29, y: 0 },
    { x: 0.76, y: 0.1 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0.22, y: 0 },
    { x: 0.96, y: 1 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0.53, y: 1 },
    { x: 1, y: 1 },
  ]
);

export let heatColorMap = createColorMap(
  'Heat',
  [
    { x: 0, y: 0 },
    { x: 0.34, y: 1 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0.65, y: 0 },
    { x: 0.98, y: 1 },
    { x: 1, y: 1 },
  ]
);

export let redColorMap = createColorMap(
  'Red',
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]
);

export let greenColorMap = createColorMap(
  'Green',
  [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]
);

export let blueColorMap = createColorMap(
  'Blue',
  [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]
);

export let balmerColorMap = createColorMap(
  'Balmer',
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0.21484375 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0.4609375 },
  ]
);

export let oiiColorMap = createColorMap(
  'OIII',
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0.71875 },
  ]
);

export let aColorMap = createColorMap(
  "'A'",
  [
    { x: 0, y: 0 },
    { x: 0.25, y: 0 },
    { x: 0.5, y: 1 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0.25, y: 1 },
    { x: 0.5, y: 0 },
    { x: 0.77, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0.125, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0.64, y: 0.5 },
    { x: 0.77, y: 0 },
    { x: 1, y: 0 },
  ]
);

export let harmonyColorMap = createColorMap(
  'Harmony',
  [
    { x: 0, y: 0 },
    { x: 1, y: 0.19215 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0.105882 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]
);

export let blueGreenColorMap = createColorMap(
  'Blue-Green',
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]
);

export let COLOR_MAPS = [
  grayColorMap,
  redColorMap,
  greenColorMap,
  blueColorMap,
  balmerColorMap,
  oiiColorMap,
  harmonyColorMap,
  blueGreenColorMap,
  rainbowColorMap,
  coolColorMap,
  heatColorMap,
  aColorMap,
];

export let COLOR_MAPS_BY_NAME: { [name: string]: ColorMap } = {};
COLOR_MAPS.forEach((cm) => (COLOR_MAPS_BY_NAME[cm.name] = cm));
