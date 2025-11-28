import { Layout } from "@/components/Layout";
import { Calendar, Trophy, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SeasonalEvents = () => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("seasonal_events")
        .select("*")
        .eq("active", true)
        .order("start_date", { ascending: true });

      setEvents(data || []);
    };

    fetchEvents();
  }, []);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">SEASONAL EVENTS</h1>
          <p className="text-muted-foreground uppercase tracking-wider">Limited Time Challenges</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.length === 0 ? (
            <div className="col-span-2 border border-border p-12 text-center">
              <p className="text-muted-foreground uppercase tracking-wider">
                No Active Events
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="border border-border p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold uppercase">{event.name}</h3>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </div>
                  <Calendar className="h-5 w-5" />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {new Date(event.start_date).toLocaleDateString()} -{" "}
                      {new Date(event.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  {event.rewards && Object.keys(event.rewards).length > 0 && (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span>Special Rewards Available</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SeasonalEvents;
