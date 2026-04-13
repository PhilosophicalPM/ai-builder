export interface Pill {
  label: string;
  question: string;
}

export interface Profile {
  // Identity
  slug: string;
  name: string;
  description: string;
  parent?: string; // inherit from industry-level profile

  // Content
  pills: Pill[];
  cannedAnswers: Record<string, string>;

  // Context for LLM
  jdContext: string; // job description and role-specific context
  systemPromptAdditions: string; // extra instructions for this profile

  // Links (override defaults if needed)
  links?: {
    linkedin?: string;
    substack?: string;
    twitter?: string;
    resume?: string;
  };

  // Contact (override defaults if needed)
  contact?: {
    email?: string;
    phone?: string;
  };
}

export interface ProfileMeta {
  slug: string;
  name: string;
  description: string;
  parent?: string;
}
