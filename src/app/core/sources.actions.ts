import { Source } from './models/source';

/* Source */
export class UpdateSource {
  public static readonly type = '[Sources] Update Source'

  constructor(public sourceId: string, public changes: Partial<Source>) { }
}

export class AddSources {
  public static readonly type = '[Sources] Add Source'

  constructor(public sources: Source[]) { }
}

export class RemoveSources {
  public static readonly type = '[Sources] Remove Source'

  constructor(public sources: Source[]) { }
}

export class SelectSources {
  public static readonly type = '[Sources] Select Sources'

  constructor(public sources: Source[]) { }
}

export class DeselectSources {
  public static readonly type = '[Sources] Deselect Sources'

  constructor(public sources: Source[] ) { }
}

export class SetSourceSelection {
  public static readonly type = '[Sources] Set Source Selection'

  constructor(public sources: Source[]) { }
}