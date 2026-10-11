import { Suspense } from "react";
import { FormularioAuth } from "@/components/auth/formulario-auth";

export const metadata = { title: "Crear cuenta — Open Market" };

export default function RegistroPage() {
  return (
    <Suspense>
      <FormularioAuth modo="registro" />
    </Suspense>
  );
}
