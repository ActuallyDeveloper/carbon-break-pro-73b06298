import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Play, 
  Users, 
  Trophy, 
  ShoppingBag, 
  Zap, 
  Target,
  Coins,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-12 animate-fade-in">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight transition-all duration-300 hover:scale-105">
            CARBON
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Break bricks, collect coins, and dominate the leaderboard in this modern take on a classic game.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-bounce-in"
            onClick={() => navigate("/single-player")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Target className="h-6 w-6 transition-transform group-hover:rotate-12" />
                Single Player
              </CardTitle>
              <CardDescription>
                Progress through levels and earn coins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full transition-all duration-200 hover:scale-105" size="lg">
                <Play className="mr-2 h-5 w-5" />
                Start Playing
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-bounce-in"
            style={{ animationDelay: '0.1s' }}
            onClick={() => navigate("/multiplayer")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-6 w-6 transition-transform group-hover:rotate-12" />
                Multiplayer
              </CardTitle>
              <CardDescription>
                Challenge players in real-time battles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full transition-all duration-200 hover:scale-105" size="lg">
                <Zap className="mr-2 h-5 w-5" />
                Find Match
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="text-center transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in">
            <CardHeader>
              <Coins className="h-8 w-8 mx-auto mb-2 text-yellow-600 dark:text-yellow-400 transition-transform hover:rotate-180" />
              <CardTitle className="text-lg">Collect Coins</CardTitle>
              <CardDescription className="text-sm">
                Earn currency from breaking bricks
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 transition-transform hover:scale-110" />
              <CardTitle className="text-lg">Customize</CardTitle>
              <CardDescription className="text-sm">
                Unlock skins, effects, and auras
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <Trophy className="h-8 w-8 mx-auto mb-2 transition-transform hover:scale-110" />
              <CardTitle className="text-lg">Compete</CardTitle>
              <CardDescription className="text-sm">
                Climb the leaderboards
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <Star className="h-8 w-8 mx-auto mb-2 transition-transform hover:rotate-180" />
              <CardTitle className="text-lg">Difficulty</CardTitle>
              <CardDescription className="text-sm">
                3 levels: Easy, Medium, Hard
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Shop CTA */}
        <Card className="p-8 text-center transition-all duration-300 hover:shadow-2xl animate-slide-up">
          <h2 className="text-3xl font-bold mb-4">Visit the Shop</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Customize your game with unique balls, paddles, brick effects, backgrounds, and auras. 
            Stand out with legendary items!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => navigate("/single-player-shop")}
              className="transition-all duration-200 hover:scale-105"
            >
              Single Player Shop
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/multiplayer-shop")}
              className="transition-all duration-200 hover:scale-105"
            >
              Multiplayer Shop
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Home;
