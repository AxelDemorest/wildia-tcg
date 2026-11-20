export type PublicProfile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  banner_url: string | null;
  avatar_url: string | null;
  locale: string;
  is_public: boolean;
  created_at: string;
  /** Card in showcase slot 1 (bridge until the six-slot settings UI lands). */
  featured_card_id: string | null;
};

export type ProfileSettings = PublicProfile & {
  /** Visible only to the profile owner. */
  canEdit: true;
};
