import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { StoreService } from "./store";

const PAGE_SIZE = 20;

const POST_COLUMNS = [
  "id",
  "author_id",
  "author_type",
  "author_name",
  "author_avatar",
  "company_id",
  "content",
  "image_url",
  "category",
  "likes_count",
  "comments_count",
  "comments",
  "created_at",
  "poll",
  "reports_count",
  "video_url",
  "link_url",
  "updated_at",
].join(",");

export function useCommunityFeed(supabase: SupabaseClient) {
  const [posts, setPosts] = useState<any[]>(() => StoreService.getPosts());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const postsRef = useRef<any[]>(posts);
  const busyRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const mountedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const savePosts = useCallback((items: any[]) => {
    postsRef.current = items;
    setPosts(items);
  }, []);

  const refresh = useCallback(async () => {
    if (busyRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    busyRef.current = true;

    try {
      const loadedCount = Math.max(
        PAGE_SIZE,
        postsRef.current.length
      );

      const { data, error: queryError } = await supabase
        .from("community_posts")
        .select(POST_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(loadedCount);

      if (queryError) {
        // Handle timeout (57014) or other query errors gracefully
        throw queryError;
      }

      if (!mountedRef.current) return;

      const result = data || [];
      const merged = result.length > 0 ? result : StoreService.getPosts();

      savePosts(merged);
      setHasMore(merged.length >= PAGE_SIZE);
      setError(null);

    } catch (err: any) {
      console.warn("[CuneneVagas Feed Notice]", err?.message || err);

      if (mountedRef.current) {
        const cached = StoreService.getPosts();
        if (cached.length > 0) {
          savePosts(cached);
        }
        setError(null);
      }
    } finally {
      busyRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }

      if (pendingRefreshRef.current && mountedRef.current) {
        pendingRefreshRef.current = false;
        setTimeout(() => {
          void refreshRef.current();
        }, 300);
      }
    }
  }, [supabase, savePosts]);

  refreshRef.current = refresh;

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore) return;

    busyRef.current = true;
    setLoadingMore(true);

    try {
      const from = postsRef.current.length;
      const to = from + PAGE_SIZE - 1;

      const { data, error: queryError } = await supabase
        .from("community_posts")
        .select(POST_COLUMNS)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (queryError) throw queryError;

      if (!mountedRef.current) return;

      const existing = postsRef.current;
      const ids = new Set(existing.map((post: any) => post.id));

      const newPosts = (data || []).filter(
        (post: any) => !ids.has(post.id)
      );

      savePosts([...existing, ...newPosts]);
      setHasMore((data || []).length === PAGE_SIZE);
      setError(null);

    } catch (err) {
      console.warn("[CuneneVagas Feed Paginação]", err);

      if (mountedRef.current) {
        setError(null);
      }
    } finally {
      busyRef.current = false;

      if (mountedRef.current) {
        setLoadingMore(false);
      }

      if (pendingRefreshRef.current && mountedRef.current) {
        pendingRefreshRef.current = false;
        void refreshRef.current();
      }
    }
  }, [supabase, hasMore, savePosts]);

  useEffect(() => {
    mountedRef.current = true;

    void refreshRef.current();

    const scheduleRefresh = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        void refreshRef.current();
      }, 800);
    };

    const channel = supabase
      .channel("cv-community-feed-single")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_posts",
        },
        scheduleRefresh
      )
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleRefresh();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      mountedRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}
