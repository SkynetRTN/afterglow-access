/*jshint bitwise: false*/
const LOOKUP_LENGTH: number = 16384;

export interface LIColor {
  x: number;
  y: number;
}

export interface ColorMap {
  name: string;
  red: LIColor[];
  green: LIColor[];
  blue: LIColor[];
  lookup: Uint32Array;
}

function getColorFromChannel(i: number, count: number, cc: Array<LIColor>) {
  // CC must have length >= 2

  let x = i / count;
  let index = 0;
  while (index < cc.length && cc[index].x < x) {
    index++;
  }

  if (index === 0) {
    return cc[0].y * 255;
  }
  if (index === cc.length) {
    return cc[cc.length - 1].y * 255;
  }

  // interpolate
  let m = (cc[index].y - cc[index - 1].y) / (cc[index].x - cc[index - 1].x);
  if (m !== 0) {
    return (m * (x - cc[index - 1].x) + cc[index - 1].y) * 255;
  } else {
    return cc[index - 1].y * 255;
  }
}

function getColor(i: number, count: number, red: LIColor[], green: LIColor[], blue: LIColor[]) {
  let r = getColorFromChannel(i, count, red);
  let g = getColorFromChannel(i, count, green);
  let b = getColorFromChannel(i, count, blue);
  let a = 255;

  return (a << 24) | (b << 16) | (g << 8) | r;
}

function createColorMap(name: string, red: LIColor[], green: LIColor[], blue: LIColor[]): ColorMap {
  let colorMap: ColorMap = {
    name: name,
    red: red,
    green: green,
    blue: blue,
    lookup: new Uint32Array(LOOKUP_LENGTH),
  };

  for (let i = 0; i < colorMap.lookup.length; i++) {
    colorMap.lookup[i] = getColor(i, colorMap.lookup.length, colorMap.red, colorMap.green, colorMap.blue);
  }

  return colorMap;
}

export let grayColorMap = createColorMap(
  "Gray Color Map",
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
  "Rainbow Color Map",
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
  "Cool Color Map",
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
  "Heat Color Map",
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
  "Red Color Map",
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
  "Green Color Map",
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
  "Blue Color Map",
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

export let aColorMap = createColorMap(
  "'A' Color Map",
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

export let COLOR_MAPS: { [name: string]: ColorMap } = {};
[grayColorMap, rainbowColorMap, coolColorMap, heatColorMap, redColorMap, greenColorMap, blueColorMap, aColorMap].forEach(
  (cm) => (COLOR_MAPS[cm.name] = cm)
);
