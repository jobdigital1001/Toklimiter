import {
  BarChart3,
  Brain,
  Briefcase,
  Code2,
  Cog,
  Handshake,
  Headset,
  Megaphone,
  Palette,
  Rocket,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  code: Code2,
  rocket: Rocket,
  palette: Palette,
  megaphone: Megaphone,
  handshake: Handshake,
  headset: Headset,
  brain: Brain,
  cog: Cog,
  chart: BarChart3,
  shield: ShieldCheck,
  wallet: Wallet,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? Briefcase;
  return <Icon className={className} aria-hidden="true" />;
}
