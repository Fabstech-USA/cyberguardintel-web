import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Landing `/` — send signed-out users to Clerk; signed-in users to the app shell.
 */
export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/post-auth");
  }

  redirect("/sign-in");
}
