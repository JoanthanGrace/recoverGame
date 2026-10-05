import type { LevelConfig, ToolType, ZoneType } from '../types';
export type DropResult = 'correct' | 'wrong' | 'outside' | 'unobserved' | 'completed' | 'locked';

// Observation and scoring live together, so inputs cannot skip a required clue.
export class RecoverySession {
  private solved = new Set<ZoneType>();
  private observed = new Set<ZoneType>();
  private score = 0;
  constructor(private readonly level: LevelConfig) {}
  get health() { return this.score; }
  get completedCount() { return this.solved.size; }
  get finished() { return this.level.targets.every(target => this.solved.has(target.zone)); }
  isCompleted(zone: ZoneType) { return this.solved.has(zone); }
  isObserved(zone: ZoneType) { return this.observed.has(zone); }
  inspect(zone: ZoneType) {
    if (!this.finished && this.level.targets.some(target => target.zone === zone)) this.observed.add(zone);
  }
  drop(tool: ToolType, zone: ZoneType | null): DropResult {
    if (this.finished) return 'locked';
    if (zone === null) return 'outside';
    if (this.solved.has(zone)) return 'completed';
    if (this.level.observeFirst && !this.observed.has(zone)) return 'unobserved';
    const target = this.level.targets.find(item => item.tool === tool && item.zone === zone);
    if (!target) return 'wrong';
    this.solved.add(zone);
    this.score = Math.min(100, this.score + target.score);
    return 'correct';
  }
  reset() { this.solved.clear(); this.observed.clear(); this.score = 0; }
}
