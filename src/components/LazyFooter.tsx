import { lazy, Suspense } from "react";

const Footer = lazy(() => import("./Footer"));

const LazyFooter = () => (
  <Suspense fallback={<div className="h-96" />}>
    <Footer />
  </Suspense>
);

export default LazyFooter;
