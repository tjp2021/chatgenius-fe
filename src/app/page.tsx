import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          ChatGenius
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">Sign in</Link>
          <Link 
            href="/sign-up"
            className="rounded-md bg-[#1B4332] px-4 py-2 text-white"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <h1 className="text-[85px] font-bold leading-tight text-center">
          Where{' '}
          <span className="block">
            AI-powered{' '}
            <span className="text-[#1B4332]">collaboration</span>
          </span>
          <span className="block">happens</span>
        </h1>

        <p className="mt-6 text-xl text-gray-600 max-w-2xl text-center">
          Transform your team communication with intelligent chat, automated workflows, and AI assistance.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/sign-up"
            className="rounded-md bg-[#1B4332] px-4 py-2 text-white"
          >
            Get Started
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Free to try, no credit card required
        </p>
      </div>
    </div>
  )
}

