"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-[#1a1a1a] bg-black/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-wide text-white"
          >
            synapse
          </Link>

          {session?.user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={24}
                    height={24}
                    className="rounded-full opacity-70"
                  />
                )}
                <span className="text-xs text-gray-500">
                  {session.user.name}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
