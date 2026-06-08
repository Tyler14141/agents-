import type { AgentProposal, ProposalKind, AgentRole, SourceRef, ProposalEffect } from '../types';

let seq = 0;
/** Deterministic-ish id for generated proposals within a run. */
export function pid(): string {
  seq += 1;
  return `P-${Date.now().toString(36)}-${seq}`;
}

export function usd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export interface DraftInput {
  role: AgentRole;
  kind: ProposalKind;
  title: string;
  rationale: string;
  draft: string;
  suggestedAction: string;
  confidence: number;
  sources: SourceRef[];
  effect?: ProposalEffect;
}

export function makeProposal(input: DraftInput): AgentProposal {
  return {
    id: pid(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...input,
  };
}
