import { useId } from "react"

import { cn } from "@/lib/utils"

/** The Keepsake mark: a K whose arms hold a photo frame. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg
      viewBox="0 0 64 56"
      fill="none"
      aria-hidden
      className={cn("h-7 w-auto shrink-0", className)}
    >
      <defs>
        <linearGradient
          id={id}
          x1="18"
          y1="50"
          x2="58"
          y2="6"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FF3363" />
          <stop offset=".55" stopColor="#FF6B3D" />
          <stop offset="1" stopColor="#FFB23F" />
        </linearGradient>
      </defs>
      <path
        fill="#FFF8F3"
        d="M7 2h7a5 5 0 0 1 5 5v11.2L32.4 4.5A8 8 0 0 1 38.1 2H55a7 7 0 0 1 7 7v38a7 7 0 0 1-7 7H38.1a8 8 0 0 1-5.7-2.5L19 37.8V49a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
      />
      <path
        fill={`url(#${id})`}
        d="M24.6 28 38.4 13.6a3 3 0 0 1 2.2-.9H52a2.5 2.5 0 0 1 2.5 2.5v25.6a2.5 2.5 0 0 1-2.5 2.5H40.6a3 3 0 0 1-2.2-.9Z"
      />
      <circle cx="45.5" cy="21" r="4" fill="#FFC96B" opacity=".9" />
      <path
        fill="#E8184F"
        opacity=".55"
        d="M34.5 38.8 41 32.3l7.2 7.2 3-3 3.3 3.3v1a2.5 2.5 0 0 1-2.5 2.5H40.6a3 3 0 0 1-2.2-.9Z"
      />
      <path fill="#FFF8F3" opacity=".35" d="M33 23.5v9l7-4.5Z" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-heading text-xl font-extrabold tracking-[-0.02em]">
        Keepsake
      </span>
    </span>
  )
}
