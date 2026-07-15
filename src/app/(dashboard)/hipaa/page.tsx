import { redirect } from "next/navigation";

/** Legacy HIPAA overview path — Overview lives on the main dashboard. */
export default function Page(): never {
  redirect("/dashboard");
}
