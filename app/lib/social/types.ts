// Social Insight AI — shared domain types.
// Mirrors supabase/migrations/0003_social_insight_ai.sql.

export type AppRole = 'super_admin' | 'org_admin' | 'analyst' | 'viewer';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type Emotion = 'happy' | 'angry' | 'frustrated' | 'excited' | 'neutral';
export type CommentCategory =
  | 'product' | 'price' | 'delivery' | 'service' | 'promotion' | 'quality' | 'other';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type ReportKind = 'daily' | 'weekly' | 'monthly' | 'executive';
export type ReportFormat = 'pdf' | 'excel' | 'pptx' | 'json';
export type IngestSource =
  | 'manual' | 'csv' | 'meta_content_library' | 'graph_ppca' | 'third_party';
export type PlanTier = 'free' | 'starter' | 'growth' | 'enterprise';

export interface Organization { id: string; name: string; slug: string; plan: PlanTier; settings: Record<string, unknown>; }
export interface User { id: string; organizationId: string | null; email: string; fullName?: string; avatarUrl?: string; role: AppRole; }

export interface TrackedPage {
  id: string; organizationId: string; fbPageId?: string; name: string; url: string;
  category?: string; followerCount?: number; profileImage?: string; coverImage?: string;
  isOwnBrand: boolean; ingestSource: IngestSource; lastSyncedAt?: string;
}

export interface Post {
  id: string; organizationId: string; pageId: string; fbPostId?: string;
  content?: string; media: { type: string; url: string }[]; permalink?: string;
  postedAt?: string; likeCount: number; commentCount: number; shareCount: number;
  reactionCounts: Record<string, number>; contentCategory?: string;
}

export interface Comment {
  id: string; organizationId: string; postId: string; fbCommentId?: string;
  authorHash?: string; content?: string; likeCount: number; commentedAt?: string;
  analyzed: boolean;
}

export interface SentimentResult {
  commentId: string; sentiment: Sentiment; emotion: Emotion;
  category: CommentCategory; confidence: number; model: string;
}

export interface KpiSnapshot {
  trackedPages: number; postsCollected: number; commentsCollected: number;
  positivePct: number; negativePct: number; trendingKeywords: string[];
  competitorRanking: { page: string; score: number }[];
}

// ── Ingestion adapter contract (see ingestion.ts) ────────────────────────
export interface RawPost {
  fbPostId: string; content?: string; media?: { type: string; url: string }[];
  permalink?: string; postedAt?: string;
  likeCount?: number; commentCount?: number; shareCount?: number;
  reactionCounts?: Record<string, number>;
}
export interface RawComment {
  fbCommentId: string; author?: string; content?: string;
  likeCount?: number; commentedAt?: string;
}
export interface RawPageData {
  fbPageId?: string; name: string; url: string; category?: string;
  followerCount?: number; profileImage?: string; coverImage?: string;
  posts: (RawPost & { comments?: RawComment[] })[];
}
