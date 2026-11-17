export type CompletenessInput = {
  name?: string | null;
  headline?: string | null;
  location?: string | null;
  bio?: string | null;
  skills?: string[];
  hasCv?: boolean;
  links?: (string | null | undefined)[];
  experienceCount?: number;
  educationCount?: number;
};

export type CompletenessItem = { key: string; label: string; weight: number; done: boolean };

const filled = (v: string | null | undefined) => Boolean(v && v.trim().length > 0);

/** Weighted checklist that drives the profile completeness indicator. Weights sum to 100. */
export function profileCompleteness(input: CompletenessInput): {
  percent: number;
  items: CompletenessItem[];
  missing: CompletenessItem[];
} {
  const items: CompletenessItem[] = [
    { key: "name", label: "Add your name", weight: 10, done: filled(input.name) },
    { key: "headline", label: "Write a headline", weight: 10, done: filled(input.headline) },
    { key: "location", label: "Add your location", weight: 5, done: filled(input.location) },
    { key: "bio", label: "Write a short bio", weight: 15, done: (input.bio?.trim().length ?? 0) >= 40 },
    { key: "skills", label: "List at least 3 skills", weight: 15, done: (input.skills?.length ?? 0) >= 3 },
    { key: "experience", label: "Add work experience", weight: 15, done: (input.experienceCount ?? 0) > 0 },
    { key: "education", label: "Add education", weight: 10, done: (input.educationCount ?? 0) > 0 },
    { key: "cv", label: "Upload your CV", weight: 15, done: Boolean(input.hasCv) },
    { key: "links", label: "Add a portfolio, LinkedIn, or GitHub link", weight: 5, done: (input.links ?? []).some(filled) },
  ];
  const percent = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  return { percent, items, missing: items.filter((i) => !i.done) };
}
