import { AnalysisResult, Board } from "../types";

const apiFetch = async <T>(path: string, options: RequestInit & { body?: unknown } = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

export const listBoards = async (): Promise<Board[]> => {
  const response = await apiFetch<{ boards: Board[] }>("/api/boards");
  return response.boards;
};

export const createBoard = async (title: string): Promise<Board> =>
  apiFetch<Board>("/api/boards", {
    method: "POST",
    body: { title }
  });

export const deleteBoard = async (id: string): Promise<void> => {
  await apiFetch<void>(`/api/boards/${id}`, { method: "DELETE" });
};

export const getBoard = async (id: string): Promise<Board> =>
  apiFetch<Board>(`/api/boards/${id}`);

export const updateBoard = async (
  id: string,
  updates: { result?: AnalysisResult | null; title?: string }
): Promise<Board> =>
  apiFetch<Board>(`/api/boards/${id}`, {
    method: "PATCH",
    body: updates
  });

export const shareBoard = async (id: string, email: string): Promise<Board> =>
  apiFetch<Board>(`/api/boards/${id}/share`, {
    method: "POST",
    body: { email }
  });
