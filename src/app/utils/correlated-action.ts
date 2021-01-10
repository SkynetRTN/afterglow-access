import { Injectable } from "@angular/core";

@Injectable()
export class CorrelationIdGenerator {
  /** Seed for the ids */
  protected seed = 0;
  /** Prefix of the id, 'CRID; */
  protected prefix = "CRID";
  /** Return the next correlation id */
  next() {
    this.seed += 1;
    return this.prefix + this.seed;
  }
}
