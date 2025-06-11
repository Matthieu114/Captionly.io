import Link from "next/link"

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white relative overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent" />
            <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-5 px-6 z-10 rounded-b-xl bg-transparent backdrop-blur-md" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold tracking-tight text-blue-400">Captionly</span>
                    <span className="rounded bg-blue-900/40 text-xs px-2 py-1 ml-2 text-blue-200">AI Video Captions</span>
                </div>
                <nav className="flex gap-4">
                    <Link href="/dashboard" className="font-semibold text-white hover:text-blue-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-3 py-2">Dashboard</Link>
                    <Link href="/upload" className="font-semibold text-white hover:text-blue-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-3 py-2">Upload</Link>
                    <Link href="/login" className="font-semibold text-white hover:text-blue-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-3 py-2">Login</Link>
                </nav>
            </header>
            <section className="flex-1 flex flex-col items-center justify-center z-10 px-4">
                <h1 className="text-4xl md:text-6xl font-extrabold text-center leading-tight mb-6">
                    <span className="text-white">AI-Powered Video </span>
                    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">Captioning</span>
                    <span className="text-white"> for Creators</span>
                </h1>
                <p className="text-lg md:text-2xl text-slate-200 text-center max-w-2xl mb-8">
                    Instantly generate, edit, and burn captions onto your videos. Boost accessibility, engagement, and reach with Captionly.io.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/upload"
                        className="rounded-lg bg-blue-500 hover:bg-blue-600 transition text-white px-8 py-3 text-lg font-semibold shadow-lg shadow-blue-900/20"
                    >
                        Get Started Free
                    </Link>
                    <Link
                        href="/dashboard"
                        className="rounded-lg border border-blue-400 text-blue-200 hover:bg-blue-900/30 transition px-8 py-3 text-lg font-semibold"
                    >
                        View Dashboard
                    </Link>
                </div>
            </section>
            <footer className="w-full text-center text-xs text-slate-400 py-6 z-10">
                &copy; {new Date().getFullYear()} Captionly.io &mdash; AI Video Captioning SaaS
            </footer>
        </main>
    )
} 