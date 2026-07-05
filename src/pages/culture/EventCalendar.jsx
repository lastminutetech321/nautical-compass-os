import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Ticket, Loader2, Video, Users } from "lucide-react";
import moment from "moment";

export default function EventCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.LiveEvent.list('start_date', 100).catch(() => []);
      setEvents(data);
      setLoading(false);
    };
    load();
  }, []);

  const upcoming = events.filter(e => e.status === 'announced' || e.status === 'tickets_on_sale' || e.status === 'sold_out');
  const live = events.filter(e => e.status === 'live');
  const completed = events.filter(e => e.status === 'completed');
  const totalRevenue = events.reduce((s, e) => s + (e.total_revenue || 0), 0);
  const totalTickets = events.reduce((s, e) => s + (e.tickets_sold || 0), 0);

  const statusColors = {
    announced: "rgba(201,151,58,0.2)",
    tickets_on_sale: "rgba(34,197,94,0.2)",
    sold_out: "rgba(239,68,68,0.2)",
    live: "rgba(239,68,68,0.3)",
    completed: "rgba(100,100,100,0.2)",
    cancelled: "rgba(100,100,100,0.1)",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail</p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}><Calendar className="w-6 h-6" style={{ color: "#c9973a" }} />Event Calendar</h1>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Calendar className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{upcoming.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Upcoming Events</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Ticket className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalTickets.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Tickets Sold</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Users className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>${totalRevenue.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Revenue</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Video className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{events.filter(e => e.is_virtual).length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Virtual Events</p></Card>
          </div>

          {live.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "#ef4444" }}>🔴 Live Now</p>
              {live.map(e => <EventCard key={e.id} event={e} statusColors={statusColors} live />)}
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "rgba(201,151,58,0.6)" }}>Upcoming Events</p>
            <div className="space-y-2">
              {upcoming.length === 0 ? <Card className="p-6 text-center text-sm" style={{ color: "rgba(201,151,58,0.4)" }}>No upcoming events</Card> :
                upcoming.map(e => <EventCard key={e.id} event={e} statusColors={statusColors} />)
              }
            </div>
          </div>

          {completed.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "rgba(201,151,58,0.6)" }}>Completed Events</p>
              <div className="space-y-2">
                {completed.slice(0, 5).map(e => <EventCard key={e.id} event={e} statusColors={statusColors} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event, statusColors, live }) {
  return (
    <Card className="p-4 border" style={{ background: live ? "rgba(239,68,68,0.05)" : "rgba(201,151,58,0.03)", borderColor: live ? "rgba(239,68,68,0.3)" : "rgba(201,151,58,0.15)" }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge style={{ background: statusColors[event.status] || statusColors.announced, color: "#f5e9c8" }} className="text-[9px]">{event.status?.replace(/_/g, " ")}</Badge>
          <Badge variant="outline" className="text-[9px]" style={{ color: "#c9973a", borderColor: "rgba(201,151,58,0.3)" }}>{event.event_type?.replace(/_/g, " ")}</Badge>
          {event.is_virtual && <Badge style={{ background: "rgba(100,116,139,0.2)", color: "#c9973a" }} className="text-[9px]"><Video className="w-2.5 h-2.5 mr-0.5" />Virtual</Badge>}
        </div>
        <span className="text-[9px]" style={{ color: "rgba(201,151,58,0.4)" }}>{moment(event.start_date).format("MMM D, YYYY")} at {event.start_time}</span>
      </div>
      <p className="text-sm font-bold mb-1" style={{ color: "#f5e9c8" }}>{event.title}</p>
      {event.artist_name && <p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{event.artist_name}</p>}
      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
        <div className="flex items-center gap-1" style={{ color: "rgba(201,151,58,0.4)" }}><MapPin className="w-3 h-3" />{event.venue_name || event.city || "TBD"}</div>
        <div className="flex items-center gap-1" style={{ color: "rgba(201,151,58,0.4)" }}><Ticket className="w-3 h-3" />{event.tickets_sold || 0}/{event.capacity || "∞"}</div>
        <div className="flex items-center gap-1" style={{ color: "#c9973a" }}><Clock className="w-3 h-3" />${event.ticket_price || 0}</div>
      </div>
    </Card>
  );
}