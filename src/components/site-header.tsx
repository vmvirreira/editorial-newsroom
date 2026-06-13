import Link from "next/link";
import { Newspaper, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/actions";
import type { Category } from "@/lib/types";

type SiteHeaderProps = {
  categories: Category[];
  isAdmin?: boolean;
  signedIn?: boolean;
};

export function SiteHeader({
  categories,
  isAdmin = false,
  signedIn = false,
}: SiteHeaderProps) {
  return (
    <header className="border-b border-stone-300 bg-[#fbfaf7]">
      <div className="mx-auto flex max-w-7xl items-center justify-between border-b border-stone-200 px-4 py-3 text-xs uppercase tracking-[0.18em] text-stone-600">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Newspaper className="h-4 w-4" />
          Saturday, June 13, 2026
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 border border-stone-900 px-3 py-1.5 text-stone-950 transition hover:bg-stone-950 hover:text-white"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </Link>
          ) : null}
          {signedIn ? (
            <form action={signOut}>
              <button className="border border-stone-300 px-3 py-1.5 transition hover:border-stone-950">
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/admin"
              className="border border-stone-300 px-3 py-1.5 transition hover:border-stone-950"
            >
              Staff login
            </Link>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 text-center">
        <Link
          href="/"
          className="font-serif text-5xl font-black tracking-[-0.05em] text-stone-950 sm:text-7xl"
        >
          The Civic Ledger
        </Link>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto border-t border-stone-300 px-4 py-3 text-sm font-semibold text-stone-800">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="whitespace-nowrap transition hover:text-red-800"
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
