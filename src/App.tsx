import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import SinglePlayer from "./pages/SinglePlayer";
import Multiplayer from "./pages/Multiplayer";
import MultiplayerGame from "./pages/MultiplayerGame";
import SinglePlayerShop from "./pages/SinglePlayerShop";
import MultiplayerShop from "./pages/MultiplayerShop";
import Tournaments from "./pages/Tournaments";
import Social from "./pages/Social";
import LevelDesigner from "./pages/LevelDesigner";
import LevelBrowser from "./pages/LevelBrowser";
import SeasonalEvents from "./pages/SeasonalEvents";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/home" element={<Home />} />
              <Route path="/single-player" element={<SinglePlayer />} />
              <Route path="/multiplayer" element={<Multiplayer />} />
              <Route path="/multiplayer/:matchId" element={<MultiplayerGame />} />
              <Route path="/single-player-shop" element={<SinglePlayerShop />} />
              <Route path="/multiplayer-shop" element={<MultiplayerShop />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/social" element={<Social />} />
              <Route path="/level-designer" element={<LevelDesigner />} />
              <Route path="/level-browser" element={<LevelBrowser />} />
              <Route path="/seasonal-events" element={<SeasonalEvents />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
