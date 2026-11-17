import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Genius123!";
export const USERS = {
  admin: "admin@genius.test",
  recruiter: "recruiter@genius.test",
  candidate: "candidate@genius.test",
};

export async function signIn(page: Page, email: string, landing: RegExp) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(landing);
}

/** A tiny but structurally valid PDF for upload tests. */
export const SAMPLE_CV = {
  name: "casey-cv.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"),
};
