import { Layout } from "@/components/Layout";
import { Info, Code, Heart } from "lucide-react";

const About = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-2">
          <Info className="h-8 w-8" />
          <h1 className="text-4xl font-bold tracking-tight">ABOUT CARBON</h1>
        </div>

        <div className="space-y-6">
          <div className="border border-border p-8 space-y-4">
            <h2 className="text-2xl font-bold">What is Carbon?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Carbon is a modern brick breaker game built with cutting-edge web technologies.
              Experience the classic arcade gameplay reimagined with real-time multiplayer,
              custom level design, and a vibrant competitive scene.
            </p>
          </div>

          <div className="border border-border p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Code className="h-6 w-6" />
              <h2 className="text-2xl font-bold">Technology Stack</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {["Vite", "React", "TypeScript", "Tailwind CSS", "Supabase", "shadcn/ui"].map((tech) => (
                <div key={tech} className="border border-border p-4 text-center font-medium">
                  {tech}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6" />
              <h2 className="text-2xl font-bold">Features</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Single Player & Multiplayer Modes</li>
              <li>• Real-time Competitive Matches</li>
              <li>• Custom Level Designer</li>
              <li>• Shop System with Skins & Effects</li>
              <li>• Tournaments & Seasonal Events</li>
              <li>• Social Features & Chat</li>
              <li>• Leaderboards & Rankings</li>
              <li>• Mobile Responsive Design</li>
            </ul>
          </div>

          <div className="text-center pt-8">
            <p className="text-sm text-muted-foreground uppercase tracking-widest">
              Version 1.0.0 • 2025
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;
