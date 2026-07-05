import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompassCard({ icon: Icon, title, color = "text-primary", children, action, className }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-4 h-4 ${color}`} />}
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-sm">
        {children}
      </CardContent>
    </Card>
  );
}