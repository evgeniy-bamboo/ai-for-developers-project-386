import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "@/components/layout.tsx";
import { AdminPage } from "@/pages/admin.tsx";
import { BookPage } from "@/pages/book.tsx";
import { HomePage } from "@/pages/home.tsx";
import { NotFoundPage } from "@/pages/not-found.tsx";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="book" element={<BookPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
