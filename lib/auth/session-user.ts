/** Auth session shape used by the app — independent of Supabase (Nest-ready). */
export type SessionUser = {
  id: string;
  email?: string | null;
};
