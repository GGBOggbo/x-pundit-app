import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/index";

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * 获取当前登录用户，未登录返回 null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
  };
}

/**
 * 获取当前登录用户，未登录抛错
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
