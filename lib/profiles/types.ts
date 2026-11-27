export type PublicProfile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  banner_url: string | null;
  avatar_url: string | null;
  locale: string;
  is_public: boolean;
  featured_card_id: string | null;
};

export type ProfileSettings = PublicProfile & {
  /** Visible only to the profile owner. */
  canEdit: true;
};
