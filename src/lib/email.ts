import "server-only";
import { Resend } from "resend";
import { APPLICATION_STATUS_LABELS, SITE, type ApplicationStatusValue } from "@/lib/constants";
import { appUrl } from "@/lib/utils";

let client: Resend | null = null;
function resend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Mail = { to: string | string[]; subject: string; heading: string; paragraphs: string[]; cta?: { label: string; url: string } };

/** Builds a minimal, client-safe HTML email. All dynamic text must already be escaped by the caller via `escapeHtml`. */
export function renderEmail({ heading, paragraphs, cta }: Omit<Mail, "to" | "subject">): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#3f3f46;font-size:15px">${p}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="background:#4338ca;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px"><tr><td>
<p style="margin:0 0 24px;font-weight:700;font-size:16px;color:#18181b">${escapeHtml(SITE.name)}</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#18181b">${heading}</h1>
${body}${button}
<p style="margin:24px 0 0;font-size:12px;color:#a1a1aa">You are receiving this email because of your activity on ${escapeHtml(SITE.name)}.</p>
</td></tr></table></body></html>`;
}

async function send(mail: Mail): Promise<void> {
  const html = renderEmail(mail);
  const from = process.env.EMAIL_FROM ?? `${SITE.name} <onboarding@resend.dev>`;
  const api = resend();
  if (!api) {
    console.info(`[email:dev] to=${[mail.to].flat().join(",")} subject="${mail.subject}"`);
    return;
  }
  try {
    const { error } = await api.emails.send({ from, to: mail.to, subject: mail.subject, html });
    if (error) console.error("[email] send failed", error);
  } catch (error) {
    // Email must never break the user-facing request.
    console.error("[email] send threw", error);
  }
}

export function sendWelcomeEmail(to: string, name: string, role: "CANDIDATE" | "RECRUITER") {
  return send({
    to,
    subject: `Welcome to ${SITE.name}`,
    heading: `Welcome, ${escapeHtml(name)}`,
    paragraphs:
      role === "RECRUITER"
        ? ["Your recruiter account is ready. Create your company profile and publish your first role in minutes."]
        : ["Your account is ready. Complete your profile so companies can see what makes you exceptional."],
    cta:
      role === "RECRUITER"
        ? { label: "Set up your company", url: appUrl("/recruiter/company") }
        : { label: "Complete your profile", url: appUrl("/account") },
  });
}

export function sendApplicationReceivedEmail(to: string, data: { name: string; jobTitle: string; company: string }) {
  return send({
    to,
    subject: `Application received: ${data.jobTitle} at ${data.company}`,
    heading: "Your application is in",
    paragraphs: [
      `Hi ${escapeHtml(data.name)}, we’ve sent your application for <strong>${escapeHtml(data.jobTitle)}</strong> to ${escapeHtml(data.company)}.`,
      "You can follow its progress from your applications page. We’ll email you when the status changes.",
    ],
    cta: { label: "Track your application", url: appUrl("/account/applications") },
  });
}

export function sendNewApplicationEmail(
  to: string[],
  data: { candidate: string; jobTitle: string; applicationId: string },
) {
  if (to.length === 0) return Promise.resolve();
  return send({
    to,
    subject: `New application: ${data.jobTitle}`,
    heading: "You have a new applicant",
    paragraphs: [`<strong>${escapeHtml(data.candidate)}</strong> applied for <strong>${escapeHtml(data.jobTitle)}</strong>.`],
    cta: { label: "Review application", url: appUrl(`/recruiter/applications/${data.applicationId}`) },
  });
}

export function sendStatusUpdateEmail(
  to: string,
  data: { name: string; jobTitle: string; company: string; status: ApplicationStatusValue },
) {
  return send({
    to,
    subject: `Update on your application: ${data.jobTitle}`,
    heading: "Your application status changed",
    paragraphs: [
      `Hi ${escapeHtml(data.name)}, ${escapeHtml(data.company)} updated your application for <strong>${escapeHtml(data.jobTitle)}</strong>.`,
      `New status: <strong>${escapeHtml(APPLICATION_STATUS_LABELS[data.status])}</strong>`,
    ],
    cta: { label: "View application", url: appUrl("/account/applications") },
  });
}

export function sendNewsletterWelcomeEmail(to: string) {
  return send({
    to,
    subject: `You’re subscribed to ${SITE.name}`,
    heading: "You’re on the list",
    paragraphs: ["Thanks for subscribing. Expect a short, curated digest of standout roles and hiring companies."],
    cta: { label: "Browse jobs", url: appUrl("/jobs") },
  });
}

export function sendJobAlertEmail(
  to: string,
  data: { alertName: string; jobs: { title: string; company: string; slug: string; location: string }[]; searchUrl: string },
) {
  const list = data.jobs
    .map(
      (j) =>
        `<a href="${escapeHtml(appUrl(`/jobs/${j.slug}`))}" style="color:#4338ca;font-weight:600;text-decoration:none">${escapeHtml(j.title)}</a><br><span style="color:#71717a;font-size:13px">${escapeHtml(j.company)} · ${escapeHtml(j.location)}</span>`,
    );
  return send({
    to,
    subject: `${data.jobs.length} new job${data.jobs.length === 1 ? "" : "s"} for “${data.alertName}”`,
    heading: `New matches for “${escapeHtml(data.alertName)}”`,
    paragraphs: [...list, `Manage your alerts any time from your <a href="${escapeHtml(appUrl("/account/alerts"))}" style="color:#4338ca">account</a>.`],
    cta: { label: "See all matches", url: data.searchUrl },
  });
}
