import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withPostgresActor } from "../database/postgres";
import { readSelfHostedSession } from "./self-hosted-oidc";

export type SelfHostedCurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
};

export async function getSelfHostedCurrentUser(): Promise<SelfHostedCurrentUser | null> {
  const token = (await cookies()).get("oneit_session")?.value;
  if (!token) return null;

  try {
    const session = await readSelfHostedSession(token);
    const result = await withPostgresActor({ userId: session.id }, (client) =>
      client.query<{
        id: string;
        email: string;
        full_name: string | null;
        profile_active: boolean | null;
      }>(
        "select users.id, users.email, users.full_name, profiles.active as profile_active from auth.users users left join public.user_profiles profiles on profiles.id = users.id where users.id = $1 and users.active = true",
        [session.id],
      ),
    );
    const user = result.rows[0];
    if (!user || user.profile_active === false) return null;
    return { id: user.id, email: user.email, fullName: user.full_name };
  } catch {
    return null;
  }
}

export async function requireSelfHostedUser(): Promise<SelfHostedCurrentUser> {
  const user = await getSelfHostedCurrentUser();
  if (!user) redirect("/login?message=" + encodeURIComponent("Entre com sua conta OneIT autorizada."));
  return user;
}
