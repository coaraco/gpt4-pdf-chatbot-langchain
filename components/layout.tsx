interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="mx-auto flex flex-col space-y-4">
      <header className="container sticky top-0 z-40 bg-white">
        <div className="h-16 border-b border-b-slate-200 py-4">
          <nav className="flex justify-between items-center px-4">
            <div className="flex items-center">
              <a href="#" className="hover:text-slate-600 cursor-pointer" onClick={() => document.location.reload()}>
                Nuevo Chat
              </a>
            </div>
            <div className="flex items-center">
              <button data-feedback-fish>Feedback</button>
            </div>
          </nav>
        </div>
      </header>
      <div>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
