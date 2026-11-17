import { oauthSignInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const ICONS = {
  github:
    "M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.300.700-4-1.600-4-1.600-.600-1.400-1.400-1.800-1.400-1.800-1-.700.100-.700.100-.700 1.200.100 1.800 1.200 1.800 1.200 1 1.800 2.800 1.300 3.500 1 .100-.800.400-1.300.800-1.600-2.700-.300-5.500-1.300-5.500-5.900 0-1.300.500-2.400 1.200-3.200-.100-.300-.500-1.500.100-3.200 0 0 1-.300 3.300 1.200a11.500 11.500 0 0 1 6 0c2.300-1.500 3.300-1.200 3.300-1.200.600 1.700.200 2.900.100 3.200.800.800 1.200 1.900 1.200 3.200 0 4.600-2.800 5.600-5.500 5.900.400.400.800 1.100.800 2.200v3.300c0 .300.200.700.800.600A12 12 0 0 0 12 .3",
  google:
    "M12.48 10.920v3.280h7.840c-.240 1.840-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.400-6.053 2.400-4.827 0-8.600-3.893-8.600-8.720s3.773-8.720 8.600-8.720c2.600 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.440 16.133 0 12.480 0 5.867 0 .307 5.387.307 12s5.560 12 12.173 12c3.573 0 6.267-1.173 8.373-3.360 2.160-2.160 2.840-5.213 2.840-7.667 0-.760-.053-1.467-.173-2.053H12.480z",
};

export function OAuthButtons({ providers, next }: { providers: { github: boolean; google: boolean }; next?: string }) {
  const enabled = (["google", "github"] as const).filter((p) => providers[p]);
  if (enabled.length === 0) return null;
  return (
    <>
      <div className="grid gap-2.5">
        {enabled.map((provider) => (
          <form key={provider} action={oauthSignInAction}>
            <input type="hidden" name="provider" value={provider} />
            {next && <input type="hidden" name="next" value={next} />}
            <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
              <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
                <path d={ICONS[provider]} />
              </svg>
              Continue with {provider === "github" ? "GitHub" : "Google"}
            </Button>
          </form>
        ))}
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground" role="separator">
        <span className="h-px flex-1 bg-border" />
        or continue with email
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
