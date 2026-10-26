"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

function loginUrl(message: string): string {
  return `/login?message=${encodeURIComponent(message)}`;
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(loginUrl("Informe e-mail e senha."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(loginUrl("Não foi possível autenticar. Verifique suas credenciais."));
  }

  redirect("/portal");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=" + encodeURIComponent("Sessão encerrada com segurança."));
}

/**
 * Always returns the same success message. This prevents account enumeration
 * while leaving the recovery mechanism clear for legitimate users.
 */
export async function requestPasswordRecovery(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/forgot-password?message=" + encodeURIComponent("Informe seu e-mail corporativo."));
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  // Cada Preview recebe uma URL própria. O domínio fornecido pela Vercel evita
  // enviar links de recuperação para um deployment anterior.
  const origin = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.ONEIT_APP_URL ?? (host ? `${protocol}://${host}` : "http://localhost:3000");
  const redirectTo = new URL("/auth/confirm", origin);
  redirectTo.searchParams.set("next", "/reset-password");

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo.toString() });

  redirect("/forgot-password?message=" + encodeURIComponent("Se houver uma conta autorizada para este e-mail, enviaremos as instruções de redefinição."));
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < 12) {
    redirect("/reset-password?message=" + encodeURIComponent("A senha deve ter pelo menos 12 caracteres."));
  }

  if (password !== confirmation) {
    redirect("/reset-password?message=" + encodeURIComponent("A confirmação da senha não confere."));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?message=" + encodeURIComponent("O link expirou ou é inválido. Solicite uma nova redefinição."));
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/reset-password?message=" + encodeURIComponent("Não foi possível atualizar a senha. Solicite um novo link."));
  }

  redirect("/portal?message=" + encodeURIComponent("Senha atualizada com sucesso."));
}
