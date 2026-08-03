import Link from "next/link";

const links = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms of use" },
  { href: "/privacy", label: "Privacy" },
  { href: "/imprint", label: "Imprint" },
];

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Feed TLDR, Inc. All rights reserved.
      </p>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-full text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-ring"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
