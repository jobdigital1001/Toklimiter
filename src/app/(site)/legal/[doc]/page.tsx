import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

const DOCS = {
  privacy: {
    title: "Privacy",
    sections: [
      ["What we collect", "Account details you provide (name, email), profile information you choose to add, your CV if you upload one, and the applications you submit."],
      ["How it is used", "To run the service: showing your applications to the companies you apply to, sending transactional email, and sending job alerts you have created."],
      ["Who can see your profile", "You control profile visibility in your account settings. Applications always share the details you submit with the hiring company."],
      ["Your choices", "You can edit or remove your profile data and CV at any time, withdraw applications, and delete job alerts."],
    ],
  },
  terms: {
    title: "Terms",
    sections: [
      ["Using the platform", "Provide accurate information, keep your credentials secure, and use the platform only for genuine hiring and job-seeking."],
      ["Job postings", "Companies are responsible for the accuracy and legality of their postings. We may remove content that is misleading, discriminatory, or fraudulent."],
      ["Applications", "Submitting an application shares your details with the hiring company, which makes its own hiring decisions."],
      ["Accounts", "We may suspend accounts that violate these terms."],
    ],
  },
} as const;

type Params = { params: Promise<{ doc: string }> };

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { doc } = await params;
  return { title: DOCS[doc as keyof typeof DOCS]?.title };
}

export default async function LegalPage({ params }: Params) {
  const { doc } = await params;
  const content = DOCS[doc as keyof typeof DOCS];
  if (!content) notFound();
  const settings = await getSettings();
  return (
    <article className="container-page max-w-2xl py-14">
      <h1 className="text-4xl font-semibold">{content.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        A plain-language summary for {SITE.name}. Have this reviewed by counsel before launch.
      </p>
      {content.sections.map(([heading, body]) => (
        <section key={heading} className="mt-8">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <p className="mt-2 leading-7 text-foreground/85">{body}</p>
        </section>
      ))}
      <p className="mt-10 text-sm text-muted-foreground">
        Questions? Contact{" "}
        <a className="underline underline-offset-4" href={`mailto:${settings.supportEmail}`}>
          {settings.supportEmail}
        </a>
        .
      </p>
    </article>
  );
}
