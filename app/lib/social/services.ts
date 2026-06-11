// Social Insight AI — service-layer contracts (Module: SERVICES).
//
// Interfaces define the boundary; concrete classes live in
// app/lib/social/services/*.ts and use the service-role Supabase client
// (bypasses RLS) for ingestion/cron, or the user client for read paths.
// Keeping these as interfaces lets the dashboard/cron code depend on the
// contract while implementations evolve (OpenAI model swaps, provider changes).

import type {
  RawPageData, Post, Comment, SentimentResult, KpiSnapshot,
  ReportKind, ReportFormat, TrackedPage,
} from './types';

export interface PageMonitoringService {
  /** Run the chosen ingestion adapter and upsert page/posts/comments. */
  sync(pageId: string): Promise<{ posts: number; comments: number }>;
  ingestRaw(orgId: string, data: RawPageData): Promise<TrackedPage>;
}

export interface PostAnalysisService {
  topPosts(pageId: string, by: 'likes' | 'comments' | 'shares', limit?: number): Promise<Post[]>;
  postingFrequency(pageId: string, days: number): Promise<{ date: string; count: number }[]>;
  categorize(postIds: string[]): Promise<void>;   // AI content-category tagging
}

export interface CommentAnalysisService {
  /** Pull unanalyzed comments, call SentimentService, persist sentiments. */
  analyzePending(orgId: string, batch?: number): Promise<number>;
}

export interface SentimentService {
  classify(comments: { id: string; text: string }[]): Promise<SentimentResult[]>;
}

export interface KeywordMonitoringService {
  scan(orgId: string): Promise<{ matched: number }>;        // match keywords over new posts/comments
  trend(keywordId: string, days: number): Promise<{ date: string; count: number; sentiment: number }[]>;
}

export interface CompetitorService {
  rank(orgId: string): Promise<{ page: string; score: number }[]>;
  compare(orgId: string): Promise<unknown>;                 // own brand vs competitors
}

export interface TrendDetectionService {
  detect(orgId: string): Promise<{ title: string; kind: string; score: number }[]>;
}

export interface AlertService {
  evaluate(orgId: string): Promise<{ fired: number }>;      // run alert_rules, create alerts + notifications
}

export interface ReportService {
  generate(orgId: string, kind: ReportKind, format: ReportFormat,
           period: { start: string; end: string }): Promise<{ reportId: string; storagePath: string }>;
}

export interface LineService {
  sendFlex(orgId: string, payload: unknown): Promise<void>;
  pushDailyReport(orgId: string): Promise<void>;
  pushAlert(orgId: string, alertId: string): Promise<void>;
}

export interface OpenAIService {
  json<T>(system: string, user: string, schemaName?: string): Promise<T>;  // strict-JSON helper
}

export interface DashboardService {
  kpis(orgId: string): Promise<KpiSnapshot>;
}
