import Script from "next/script";

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <aside id="sidebar" aria-label="Main navigation" />
      <div className="layout min-h-screen">
        <header id="topbar" />
        <main id="main" tabIndex={-1}>
          <div className="panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="giis-logo" src="/giis-logo.png" alt="Global Indian International School" />
            <h1>Welcome to LUGHA</h1>
            <p>Preparing your Arabic adventure…</p>
            <noscript>Enable JavaScript to play LUGHA.</noscript>
          </div>
        </main>
        <footer className="text-center">لغة · Play. Learn. Connect.</footer>
      </div>
      <nav id="mobile" aria-label="Mobile navigation" />
      <dialog id="dialog" aria-label="LUGHA dialog" />
      <div id="toast" role="status" />
      <Script src="/app.mjs" type="module" strategy="afterInteractive" />
    </>
  );
}
