import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import "./index.css";

// The form route pulls in supabase-js; load it only when needed so the
// landing page stays light.
const Apply = lazy(() => import("./pages/Apply.jsx"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/apply" element={<Apply />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
