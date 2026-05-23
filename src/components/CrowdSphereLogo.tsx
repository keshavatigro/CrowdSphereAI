import Image from "next/image";
import {
  APP_NAME,
  CROWDSPHERE_LOGO_HEIGHT,
  CROWDSPHERE_LOGO_WIDTH,
  LOGO_PATH,
} from "@/lib/constants";

const sizeClasses = {
  /** Logo1.png — cap height; width scales to preserve aspect ratio */
  header:
    "h-16 w-auto max-w-[min(100%,640px)] sm:h-[4.5rem] sm:max-w-[760px] md:h-20 md:max-w-[860px]",
  splash:
    "h-20 w-auto max-w-[min(100%,720px)] sm:h-24 sm:max-w-[840px]",
} as const;

interface CrowdSphereLogoProps {
  size?: keyof typeof sizeClasses;
  priority?: boolean;
}

export function CrowdSphereLogo({ size = "header", priority }: CrowdSphereLogoProps) {
  return (
    <Image
      src={LOGO_PATH}
      alt={APP_NAME}
      width={CROWDSPHERE_LOGO_WIDTH}
      height={CROWDSPHERE_LOGO_HEIGHT}
      className={`object-contain object-left ${sizeClasses[size]}`}
      priority={priority}
    />
  );
}
