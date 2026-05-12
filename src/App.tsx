import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Discovery from "./pages/Discovery";
import ForYou from "./pages/ForYou";
import Reader from "./pages/Reader";
import Quiz from "./pages/Quiz";
import Achievements from "./pages/Achievements";
import Library from "./pages/Library";
import Leaderboard from "./pages/Leaderboard";
import Reviews from "./pages/Reviews";
import Friends from "./pages/Friends";
import ImportBook from "./pages/ImportBook";
import Shop from "./pages/Shop";
import ProfileSetup from "./pages/ProfileSetup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { settings } = useApp();

  if (!settings.onboarded) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Welcome />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/foryou" replace />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/discover" element={<Discovery />} />
      <Route path="/foryou" element={<ForYou />} />
      <Route path="/read/:bookId" element={<Reader />} />
      <Route path="/quiz/:bookId" element={<Quiz />} />
      <Route path="/achievements" element={<Achievements />} />
      <Route path="/library" element={<Library />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/reviews/:bookId" element={<Reviews />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/import" element={<ImportBook />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
