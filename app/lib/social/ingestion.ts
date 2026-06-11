// Social Insight AI — pluggable, COMPLIANT ingestion layer.
//
// The whole product hinges on this contract. We never scrape Facebook or store
// Page Access Tokens. Instead, each adapter wraps a *legitimate* source and
// normalizes it to RawPageData. Pick an adapter per page via tracked_pages.ingest_source.
//
//   manual / csv          → user pastes/uploads data they are allowed to use
//   meta_content_library  → Meta Content Library API (research/org access)
//   graph_ppca            → Graph API + Page Public Content Access (App Review)
//   third_party           → licensed provider (Apify, Brandwatch, etc.)
//
// Adapters are responsible for honoring the upstream's rate limits and ToS.

import type { RawPageData, IngestSource } from './types';

export interface IngestionAdapter {
  readonly source: IngestSource;
  /** Fetch normalized public data for one page. Throws on auth/ToS failure. */
  fetchPage(input: { url: string; fbPageId?: string; sinceDays?: number }): Promise<RawPageData>;
}

// ── Manual / CSV adapter — the safe default, works on day one ──────────────
export class ManualAdapter implements IngestionAdapter {
  readonly source: IngestSource = 'manual';
  constructor(private readonly payload: RawPageData) {}
  async fetchPage(): Promise<RawPageData> {
    return this.payload;
  }
}

// ── Meta Content Library adapter (stub: wire real client + credentials) ────
export class MetaContentLibraryAdapter implements IngestionAdapter {
  readonly source: IngestSource = 'meta_content_library';
  constructor(private readonly token: string) {}
  async fetchPage(): Promise<RawPageData> {
    // TODO: call Meta Content Library API with this.token, map → RawPageData.
    throw new Error('MetaContentLibraryAdapter: configure research access first.');
  }
}

// ── Graph API + Page Public Content Access (requires App Review) ───────────
export class GraphPpcaAdapter implements IngestionAdapter {
  readonly source: IngestSource = 'graph_ppca';
  constructor(private readonly appToken: string) {}
  async fetchPage(): Promise<RawPageData> {
    // TODO: GET /{page-id}/posts with PPCA feature granted; map → RawPageData.
    throw new Error('GraphPpcaAdapter: requires approved Page Public Content Access.');
  }
}

// ── Licensed third-party data provider ─────────────────────────────────────
export class ThirdPartyAdapter implements IngestionAdapter {
  readonly source: IngestSource = 'third_party';
  constructor(private readonly apiKey: string, private readonly baseUrl: string) {}
  async fetchPage(): Promise<RawPageData> {
    // TODO: call provider, map → RawPageData. Provider owns ToS compliance.
    throw new Error('ThirdPartyAdapter: configure provider credentials.');
  }
}

/** Resolve the adapter chosen for a page. Defaults to manual. */
export function getAdapter(source: IngestSource, cfg: Record<string, string> = {}): IngestionAdapter {
  switch (source) {
    case 'meta_content_library': return new MetaContentLibraryAdapter(cfg.token ?? '');
    case 'graph_ppca':           return new GraphPpcaAdapter(cfg.appToken ?? '');
    case 'third_party':          return new ThirdPartyAdapter(cfg.apiKey ?? '', cfg.baseUrl ?? '');
    default:                     return new ManualAdapter(cfg as unknown as RawPageData);
  }
}
