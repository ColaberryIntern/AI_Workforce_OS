import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <div className="container-fluid">
        <div className="row">
          <Sidebar />
          <main id="main" className="col-lg-10 col-md-9 py-4 px-md-5">
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
