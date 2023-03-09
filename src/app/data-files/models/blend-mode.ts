export enum BlendMode {
  Normal,
  Screen,
  Luminosity,
  Color,
  Overlay,
  Multiply,
  Lighten,
  Darken
}

export let BLEND_MODE_OPTIONS = [
  { label: 'Normal', value: BlendMode.Normal },
  { label: 'Screen', value: BlendMode.Screen },
  { label: 'Lighten', value: BlendMode.Lighten },
  { label: 'Multiply', value: BlendMode.Multiply },
  { label: 'Darken', value: BlendMode.Darken },
  { label: 'Overlay', value: BlendMode.Overlay },
  { label: 'Luminosity', value: BlendMode.Luminosity },
  { label: 'Color', value: BlendMode.Color },
];
