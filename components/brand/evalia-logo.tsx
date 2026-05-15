import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_ASPECT = 1024 / 341;

type EvaliaLogoProps = {
  /** Enlace; si es `null`, no se envuelve en Link. */
  href?: string | null;
  className?: string;
  /** Altura visual del logo en px. */
  height?: number;
  priority?: boolean;
  /** Fondo blanco detrás (headers oscuros o hero de login). */
  onDark?: boolean;
};

export function EvaliaLogo({
  href = "/dashboard",
  className,
  height = 40,
  priority = false,
  onDark = false,
}: EvaliaLogoProps) {
  const width = Math.round(height * LOGO_ASPECT);

  const image = (
    <Image
      src="/logo-evalia.png"
      alt="EvalIA — Centro de evaluación"
      width={width}
      height={height}
      className={cn("block h-auto max-w-full object-contain object-left", className)}
      style={{ height, width: "auto", maxWidth: width }}
      priority={priority}
    />
  );

  const content = onDark ? (
    <span className="inline-flex rounded-xl bg-white px-2.5 py-1.5 shadow-md ring-1 ring-black/5">{image}</span>
  ) : (
    image
  );

  if (href === null) {
    return <span className="inline-flex shrink-0">{content}</span>;
  }

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}
