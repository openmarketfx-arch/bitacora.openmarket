import { Hammer } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";

export function EnConstruccion({
  titulo,
  paso,
  descripcion,
}: {
  titulo: string;
  paso: string;
  descripcion: string;
}) {
  return (
    <>
      <Topbar titulo={titulo} descripcion={paso} />
      <main className="p-5 sm:p-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Hammer className="h-6 w-6 text-muted-foreground" />
            <p className="max-w-md text-sm text-muted-foreground">{descripcion}</p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
