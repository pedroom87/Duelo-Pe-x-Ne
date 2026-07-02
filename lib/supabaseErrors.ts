type SupabaseLikeError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  return Boolean(error && typeof error === "object" && "message" in error);
}

export function formatSupabaseError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (!isSupabaseLikeError(error)) {
    return fallback;
  }

  const parts = [
    error.message,
    error.code ? `Código: ${error.code}` : null,
    error.details ? `Detalhes: ${error.details}` : null,
    error.hint ? `Dica: ${error.hint}` : null,
  ].filter(Boolean);

  return parts.join(" | ") || fallback;
}

export function getSupabaseErrorCode(error: unknown) {
  return isSupabaseLikeError(error) ? error.code ?? null : null;
}
