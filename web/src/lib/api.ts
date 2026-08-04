/**
 * Typed API client for the Haia FastAPI backend.
 *
 * All requests include the user's Supabase JWT as the Authorization header.
 * Token is retrieved from the Supabase browser client on each call.
 *
 * Usage:
 *   const api = createApiClient(accessToken);
 *   const tasks = await api.tasks.list();
 */

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  frequency: "daily" | "weekdays" | "weekends" | "custom" | "flexible";
  custom_days?: number[];
  target_count?: number;
  target_time?: string;
  xp_value: number;
  is_active: boolean;
  subject_id?: string;
  created_at: string;
  goal_ids?: string[];
}

/**
 * Resolve the API base URL.
 *
 * • In development: falls back to localhost:8000 with a console warning so
 *   local dev still works even without a .env.local file.
 * • In production: throws immediately if NEXT_PUBLIC_API_BASE_URL is missing
 *   so a bad deploy fails loudly rather than silently hitting localhost.
 */
function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) return configured;

  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_ENV === "production";

  if (isProd) {
    throw new Error(
      "[Haia] NEXT_PUBLIC_API_BASE_URL is not set. " +
        "Add it to your deployment environment variables."
    );
  }

  // Dev-only fallback — warn once so developers notice
  if (typeof window !== "undefined") {
    console.warn(
      "[Haia] NEXT_PUBLIC_API_BASE_URL is not set. Falling back to http://localhost:8000. " +
        "Create web/.env.local and set NEXT_PUBLIC_API_BASE_URL for your environment."
    );
  }
  return "http://localhost:8000";
}

export const API_BASE = resolveApiBase();


function makeHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers: makeHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function createApiClient(accessToken: string) {
  const get  = <T>(path: string) => request<T>(accessToken, "GET",    path);
  const post = <T>(path: string, body: unknown) => request<T>(accessToken, "POST",   path, body);
  const put = <T>(path: string, body: unknown) => request<T>(accessToken, "PUT",    path, body);
  const patch = <T>(path: string, body: unknown) => request<T>(accessToken, "PATCH",  path, body);
  const del  = <T>(path: string) => request<T>(accessToken, "DELETE", path);

  const uploadFile = async <T>(path: string, file: File, fieldName = "file", extraData?: Record<string, string>) => {
    const formData = new FormData();
    formData.append(fieldName, file);
    if (extraData) {
      for (const [key, value] of Object.entries(extraData)) {
        formData.append(key, value);
      }
    }
    const res = await fetch(`${API_BASE}/api/v1${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
  };

  return {
    tasks: {
      list:     (params?: { task_status?: string; area?: string }) =>
                  get(`/tasks${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`),
      create:   (body: unknown) => post("/tasks", body),
      get:      (id: string) => get(`/tasks/${id}`),
      update:   (id: string, body: unknown) => patch(`/tasks/${id}`, body),
      complete: (id: string) => post(`/tasks/${id}/complete`, {}),
      delete:   (id: string) => del(`/tasks/${id}`),
    },

    habits: {
      list:    (active_only?: boolean) =>
                 get(`/habits${active_only !== undefined ? `?active_only=${active_only}` : ""}`),
      create:  (body: unknown) => post("/habits", body),
      update:  (id: string, body: unknown) => put(`/habits/${id}`, body),
      log:     (habitId: string, body: unknown) => post(`/habits/${habitId}/log`, body),
      getLogs: (habitId: string, limit?: number) =>
                 get(`/habits/${habitId}/logs${limit ? `?limit=${limit}` : ""}`),
    },

    goals: {
      list:   (goal_status?: string) =>
                get(`/goals${goal_status ? `?goal_status=${goal_status}` : ""}`),
      create: (body: unknown) => post("/goals", body),
      update: (id: string, body: unknown) => patch(`/goals/${id}`, body),
    },

    courses: {
      list: (semester_id?: string) =>
              get(`/courses${semester_id ? `?semester_id=${semester_id}` : ""}`),
      update: (id: string, body: unknown) => patch(`/courses/${id}`, body),
      parseSchedule: (file: File, semester_id?: string) =>
              uploadFile("/courses/parse-schedule", file, "file", semester_id ? { semester_id } : undefined),
    },

    gamification: {
      stats:     () => get("/gamification/stats"),
      xpEvents:  (limit?: number) => get(`/gamification/xp-events${limit ? `?limit=${limit}` : ""}`),
      streaks:   () => get("/gamification/streaks"),
    },

    chat: {
      history: (limit?: number) => get(`/chat/history${limit ? `?limit=${limit}` : ""}`),
      send:    (content: string, channel: "web" | "telegram" = "web") =>
                 post("/chat/message", { content, channel }),
    },

    subjects: {
      list:   (area?: string) => get(`/subjects${area ? `?area=${area}` : ""}`),
      create: (body: unknown) => post("/subjects", body),
    },

    parse: {
      text: (raw_input: string, channel = "typed") =>
              post("/parse/text", { raw_input, channel }),
      photo: (file: File) => uploadFile("/parse/photo", file),
      voice: (file: File) => uploadFile("/parse/voice", file),
      syllabus: (file: File) => uploadFile("/parse/syllabus", file),
    },
    
    integrations: {
      list: () => get<{integrations: string[]}>("/integrations"),
      telegram: {
        linkCode: () => post("/integrations/telegram/link-code", {}),
      },
      google: {
        connect: () => get("/integrations/google/connect"),
        sync: () => post("/integrations/google/sync", {}),
      }
    }
  };
}
