import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Sidekick</h1>
        <p className="text-lg text-gray-600 mb-6">Client Portal Foundation</p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-in"
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
