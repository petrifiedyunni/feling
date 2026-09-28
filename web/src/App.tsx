import { Routes, Route } from "react-router-dom";
import { SiteShell } from "./components/SiteShell";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductPage } from "./pages/ProductPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import { OpsPage } from "./pages/OpsPage";
import { ReviewPage } from "./pages/ReviewPage";
import { LoginPage } from "./pages/LoginPage";
import { RequireAuth } from "./auth/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      {/* Internal, auth-gated — no public nav, no storefront chrome */}
      <Route element={<RequireAuth />}>
        <Route path="ops" element={<OpsPage />} />
        <Route path="review" element={<ReviewPage />} />
      </Route>

      <Route element={<SiteShell />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="shop/:category" element={<ShopPage />} />
        <Route path="piece/:slug" element={<ProductPage />} />
        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
      </Route>
    </Routes>
  );
}
