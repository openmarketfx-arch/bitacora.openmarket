import { Suspense } from "react";
import { FormularioAuth } from "@/components/auth/formulario-auth";

export const metadata = { title: "Entrar — Open Market" };

export default function LoginPage() {
  return (
    <Suspense>
      <FormularioAuth modo="login" />
    </Suspense>
  );
}
